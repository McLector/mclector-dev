import { describe, expect, it } from "vitest";

/**
 * Source guards for the quiet backdrop (GalaxyBackdrop: `.galaxy`, `.stars`, `.stars-near`, `.horizon-line`).
 * The values come from the two approved mock-ups in docs/reference (2026-11-05-background-*). The e2e suite
 * checks what the browser computes; this checks the authored rules, so a change of look is a deliberate edit here.
 *
 * Comments are stripped first, so a comment that explains what was removed does not trip the guards.
 */
const sources = import.meta.glob<string>("/src/styles/index.css", {
  query: "?raw",
  import: "default",
  eager: true,
});

const stripComments = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

const css = stripComments(Object.values(sources)[0] ?? "");

type Rule = { selectors: string[]; body: string };

/** Every innermost `selector { body }` pair (no nested braces), selectors split on commas and whitespace-collapsed. */
const allRules: Rule[] = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => {
  // A capture can start with at-rule statements (`@import ...;`, `@custom-variant ...;`): keep what follows the last `;`.
  const selectorText = sel.slice(sel.lastIndexOf(";") + 1);
  return { selectors: selectorText.split(",").map(squash), body: squash(body) };
});

/** The joined bodies of every rule whose selector list contains exactly `selector`. */
function rules(selector: string): string {
  return allRules
    .filter((r) => r.selectors.includes(selector))
    .map((r) => r.body)
    .join(" ");
}

/** Every value declared for `prop` in `body`. */
function decls(body: string, prop: string): string[] {
  return body
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.startsWith(`${prop}:`))
    .map((d) => d.slice(prop.length + 1).trim());
}

const decl = (body: string, prop: string) => decls(body, prop).at(-1);

function keyframes(name: string): string {
  const m = css.match(new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?\\})\\s*\\}`));
  return squash(m?.[1] ?? "");
}

const count = (s: string, needle: string) => s.split(needle).length - 1;

const LIGHT = ':root[data-theme="light"]';
const glowMix = (pct: string) => `color-mix(in oklab, var(--arc) calc(var(--horizon-glow) * ${pct}), transparent)`;
const MASK = "linear-gradient(to bottom, black 20%, transparent 74%)";

describe("the quiet backdrop CSS", () => {
  it("loads the real stylesheet (guards against the glob matching nothing)", () => {
    expect(css.length).toBeGreaterThan(5_000);
    expect(rules(":root")).toContain("--sky-top");
  });

  it("has no trace of the removed layers", () => {
    for (const gone of [
      ".comet",
      "comet-streak",
      ".starfield-grid",
      ".galaxy-canvas",
      ".galaxy-parallax",
      ".stars-bright",
      "nebula-breathe",
      "star-twinkle",
      "--nebula-strength",
      "--neb-",
      "--grid-color",
      "--rain",
      "--star-opacity",
    ]) {
      expect(css, gone).not.toContain(gone);
    }
  });

  it("defines the glow and star tokens in both themes", () => {
    const dark = rules(":root");
    const light = rules(LIGHT);
    expect(decl(dark, "--horizon-glow")).toBe("0.3");
    expect(decl(dark, "--star-strength")).toBe("0.5");
    expect(decl(dark, "--star-color")).toBe("oklch(0.98 0.01 250)");
    expect(decl(light, "--horizon-glow")).toBe("0.3");
    expect(decl(light, "--star-strength")).toBe("0.6");
    expect(decl(light, "--star-color")).toBe("oklch(0.55 0.08 250)");
  });

  it("paints the light sky plain white, top to bottom (the white mock-up's page)", () => {
    const light = rules(LIGHT);
    expect(decl(light, "--sky-top")).toBe("#fff");
    expect(decl(light, "--sky-mid")).toBe("#fff");
    expect(decl(light, "--sky-bottom")).toBe("#fff");
    // The body paints the bottom stop, so the page behind the backdrop is white too.
    expect(decl(rules("body"), "background-color")).toBe("var(--sky-bottom)");
  });

  it("the light theme is white, not steel", () => {
    const light = rules(LIGHT);
    // The window, the cards and the tiles are the white mock-up's: opaque white cards on hairlines and soft
    // shadows, not translucent glass over a steel panel.
    expect(decl(light, "--panel")).toBe("oklch(0.985 0.004 250 / 0.9)");
    expect(decl(light, "--glass-bg")).toBe("#fff");
    expect(decl(light, "--glass-border")).toBe("oklch(0.4 0.05 250 / 0.14)");
    expect(decl(light, "--tile-bg")).toBe("oklch(0.97 0.008 250)");
    // The old steel window panel is gone from the light block.
    expect(light).not.toContain("oklch(0.42 0.1 250 / 0.338)");
  });

  it("keeps the sky to one top radial over the vertical gradient", () => {
    const sky = decl(rules(".galaxy"), "background") ?? "";
    expect(count(sky, "radial-gradient(")).toBe(1);
    expect(sky).toContain("radial-gradient(120% 90% at 50% -10%, var(--sky-top) 0%, transparent 55%)");
    expect(sky).toContain("linear-gradient(180deg, var(--sky-mid) 0%, var(--sky-bottom) 100%)");
    expect(decl(rules(".galaxy"), "z-index")).toBe("-10");
  });

  it("draws the dark horizon glow as two arc-blue radials in an unscaled box", () => {
    const glow = rules(".galaxy::before");
    // inset 0, not -10%: the radials sit at 50% 98%, and an oversized box would push the bottom glow off-screen.
    expect(decl(glow, "inset")).toBe("0");
    const image = decl(glow, "background-image") ?? "";
    expect(count(image, "radial-gradient(")).toBe(2);
    expect(image).toContain(`radial-gradient(80% 34% at 50% 98%, ${glowMix("100%")}, transparent 72%)`);
    expect(image).toContain(`radial-gradient(62% 52% at 50% 56%, ${glowMix("45%")}, transparent 74%)`);
    // The still frame (Animations off) is the peak of the breath, so it is the default look.
    expect(decl(glow, "opacity")).toBe("1");
  });

  it("gives the light theme one wash and no around-window radial", () => {
    const image = decl(rules(`${LIGHT} .galaxy::before`), "background-image") ?? "";
    expect(count(image, "radial-gradient(")).toBe(1);
    expect(image).toBe(`radial-gradient(90% 40% at 50% 108%, ${glowMix("100%")}, transparent 72%)`);
  });

  it("vignettes the dark edges and leaves the light theme unvignetted", () => {
    expect(decl(rules(".galaxy::after"), "background")).toBe(
      "radial-gradient(130% 120% at 50% 40%, transparent 50%, oklch(0.04 0.02 275 / 0.5) 100%)",
    );
    expect(decl(rules(".galaxy::after"), "opacity")).toBeUndefined();
    expect(decl(rules(`${LIGHT} .galaxy::after`), "display")).toBe("none");
  });

  it("uses the approved motion timings", () => {
    expect(decl(rules(".galaxy::before"), "animation")).toBe("horizon-breathe 30s ease-in-out infinite");
    expect(decl(rules(".stars"), "animation")).toBe("star-drift 160s linear infinite alternate");
    expect(decl(rules(".stars-near"), "animation")).toBe("star-drift 90s linear infinite alternate");
    // The light theme changes the look, never the timing.
    for (const sel of [".galaxy::before", ".stars", ".stars-near"]) {
      expect(decl(rules(`${LIGHT} ${sel}`), "animation"), sel).toBeUndefined();
    }
  });

  it("drifts the stars to translate3d(-5%, -3%, 0) and breathes the glow from 0.75 to 1", () => {
    const drift = keyframes("star-drift");
    expect(drift).toMatch(/from \{ transform: translate3d\(0, 0, 0\); \}/);
    expect(drift).toMatch(/to \{ transform: translate3d\(-5%, -3%, 0\); \}/);
    const breathe = keyframes("horizon-breathe");
    expect(breathe).toMatch(/0%, 100% \{ opacity: 0\.75; \}/);
    expect(breathe).toMatch(/50% \{ opacity: 1; \}/);
  });

  it("places both star layers as fixed, oversized, inert sheets", () => {
    for (const sel of [".stars", ".stars-near"]) {
      const body = rules(sel);
      expect(decl(body, "position"), sel).toBe("fixed");
      expect(decl(body, "inset"), sel).toBe("-10%");
      expect(decl(body, "z-index"), sel).toBe("-9");
      expect(decl(body, "pointer-events"), sel).toBe("none");
    }
  });

  it("fades both star layers toward the horizon", () => {
    for (const sel of [".stars", ".stars-near"]) {
      const body = rules(sel);
      expect(decl(body, "mask-image"), sel).toBe(MASK);
      expect(decl(body, "-webkit-mask-image"), sel).toBe(MASK);
    }
  });

  it("draws the dark far layer as eight 1px dots and the near layer as four brighter ones", () => {
    const far = rules(".stars");
    expect(count(decl(far, "background-image") ?? "", "radial-gradient(1px 1px at ")).toBe(8);
    expect(decl(far, "background-image")).toContain("radial-gradient(1px 1px at 34% 30%, var(--star-color) 99%, transparent)");
    expect(decl(far, "background-size")).toBe("50% 50%");
    expect(decl(far, "opacity")).toBe("calc(var(--star-strength) * 0.7)");

    const near = rules(".stars-near");
    const nearImage = decl(near, "background-image") ?? "";
    expect(count(nearImage, "radial-gradient(")).toBe(4);
    expect(nearImage).toContain("radial-gradient(1.8px 1.8px at 70% 26%, var(--star-color) 99%, transparent)");
    expect(decl(near, "background-size")).toBe("80% 80%");
    expect(decl(near, "opacity")).toBe("var(--star-strength)");
  });

  it("draws the light dust as eight 2px dots at the white mock-up's positions, near layer hidden", () => {
    const far = rules(`${LIGHT} .stars`);
    const image = decl(far, "background-image") ?? "";
    expect(count(image, "radial-gradient(2px 2px at ")).toBe(8);
    for (const at of ["12% 18%", "78% 12%", "34% 36%", "91% 40%", "6% 58%", "62% 48%", "48% 8%", "96% 66%"]) {
      expect(image, at).toContain(`radial-gradient(2px 2px at ${at}, var(--star-color) 99%, transparent)`);
    }
    expect(decl(far, "background-size")).toBe("46% 46%");
    expect(decl(far, "opacity")).toBe("var(--star-strength)");
    expect(decl(rules(`${LIGHT} .stars-near`), "display")).toBe("none");
  });

  it("pins the horizon hairline", () => {
    const line = rules(".horizon-line");
    expect(decl(line, "position")).toBe("fixed");
    expect(decl(line, "left")).toBe("0");
    expect(decl(line, "right")).toBe("0");
    expect(decl(line, "bottom")).toBe("4%");
    expect(decl(line, "height")).toBe("1px");
    expect(decl(line, "z-index")).toBe("-9");
    expect(decl(line, "pointer-events")).toBe("none");
    expect(decl(line, "background")).toBe(
      "linear-gradient(90deg, transparent, color-mix(in oklab, var(--arc) 55%, transparent), transparent)",
    );
    expect(decl(rules(`${LIGHT} .horizon-line`), "background")).toBe(
      "linear-gradient(90deg, transparent, color-mix(in oklab, var(--arc) 40%, transparent), transparent)",
    );
  });

  it("the motion-off rule no longer special-cases a comet", () => {
    const off = allRules.filter((r) => r.selectors.some((s) => s.includes('[data-motion="off"]')));
    expect(off.length).toBeGreaterThan(0);
    for (const r of off) {
      for (const s of r.selectors) expect(s).toMatch(/^:root\[data-motion="off"\] \*(::before|::after)?$/);
    }
  });
});
