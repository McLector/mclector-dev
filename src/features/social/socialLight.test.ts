import { describe, expect, it } from "vitest";

/**
 * Source guard: in the light theme the social hexagons carry an arc-blue tint (the portfolio's one colour)
 * instead of the neutral grey the shared rule gives them. The override must tie with the base `.hexgrid__link`
 * rule (hence `:where()` around the theme selector) so the hover / focus-visible rules, which are more specific,
 * still win. Comments are stripped first.
 */
const sources = import.meta.glob<string>("/src/features/social/social.css", {
  query: "?raw",
  import: "default",
  eager: true,
});
const raw = Object.values(sources)[0] ?? "";
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Parses the stylesheet text; CRLF checkouts (Windows autocrlf) are normalised so nothing depends on line endings. */
function parse(text: string) {
  const css = text.replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
    sel: squash(sel),
    body: squash(body),
  }));
  return { css, rules, body: (selector: string) => rules.filter((r) => r.sel === selector).map((r) => r.body) };
}

describe.each([
  ["LF", raw],
  ["CRLF", raw.replace(/\r?\n/g, "\r\n")],
])("social hexagons in the light theme (%s line endings)", (_name, text) => {
  const { css, rules, body } = parse(text);

  it("loads the real stylesheet", () => {
    expect(body(".hexgrid__link").length).toBeGreaterThan(0);
  });

  it("tints the resting hexagon with the arc colour over the card ground", () => {
    const light = body(':where(:root[data-theme="light"]) .hexgrid__link');
    expect(light).toHaveLength(1);
    expect(light[0]).toContain("background: color-mix(in oklab, var(--arc) 12%, var(--glass-bg))");
  });

  it("does not use a higher-specificity selector that would beat hover and focus", () => {
    expect(rules.some((r) => r.sel === ':root[data-theme="light"] .hexgrid__link')).toBe(false);
  });

  it("places the light override after the base rule so it wins the tie", () => {
    const base = css.indexOf(".hexgrid__link {\n  position: absolute");
    const light = css.indexOf(':where(:root[data-theme="light"]) .hexgrid__link');
    expect(base).toBeGreaterThan(-1);
    expect(light).toBeGreaterThan(base);
  });

  it("leaves the hover, focus and dark rules as they were", () => {
    expect(body(':where(:root[data-input="mouse"]) .hexgrid__link:hover')).toEqual([
      "background: color-mix(in oklab, var(--arc) 62%, transparent); color: #eafaff; transform: translateY(-2px);",
    ]);
    expect(body(".hexgrid__link:focus-visible")).toContain(
      "background: color-mix(in oklab, var(--arc) 40%, var(--color-surface-raised)); color: var(--color-text-primary);",
    );
    expect(body(".hexgrid__link").join(" ")).toContain(
      "background: color-mix(in oklab, var(--color-text-primary) 9%, transparent)",
    );
  });
});
