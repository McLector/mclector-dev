import { describe, expect, it } from "vitest";

/**
 * Source-scan guards for two owner decisions, so neither can quietly regress:
 *
 *  1. HOVER IS LOCKED ON. Every hover / focus transition works for every visitor, whatever the browser
 *     claims about its pointer and whatever the OS animation setting says. Hover used to sit behind
 *     `@media (hover: hover) and (pointer: fine)`, which a touchscreen laptop fails while a real mouse is
 *     attached; hover is now keyed to the input the visitor ACTUALLY uses (`html[data-input="mouse"]`).
 *  2. THE OS reduced-motion SETTING IS NEVER READ. Ambient motion is governed only by the visible
 *     Animations toggle (`html[data-motion]`), which defaults to on.
 *
 * Comments are stripped first, so explaining the policy does not trip it.
 */
const sources = import.meta.glob<string>("/src/**/*.{ts,tsx,css}", {
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

const scanned = Object.entries(sources)
  .filter(([path]) => !/\.test\.(ts|tsx)$/.test(path) && !path.includes("/src/test/"))
  .map(([path, text]) => ({ path, text: stripComments(text) }));

function offenders(pattern: RegExp): string[] {
  return scanned.filter(({ text }) => pattern.test(text)).map(({ path }) => path);
}

describe("hover is locked on", () => {
  it("scans a meaningful number of source files (guards against the glob silently matching nothing)", () => {
    expect(scanned.length).toBeGreaterThan(40);
  });

  it("no hover rule sits behind a hover / pointer media query", () => {
    expect(offenders(/@media[^{]*\(\s*(?:any-)?hover\s*:/i)).toEqual([]);
    expect(offenders(/\(\s*(?:any-)?pointer\s*:\s*(?:fine|coarse)\s*\)/i)).toEqual([]);
  });

  it("no transition names a property that does not exist (`colors` is not a CSS property)", () => {
    // An arbitrary transition value naming `colors` compiles to `transition-property: colors, ...`; the unknown
    // identifier matches nothing, so the colour half of the transition silently never ran. (Do not write the
    // literal class here: Tailwind scans every file in the repo, comments included, and would generate it.)
    expect(offenders(/transition-\[[^\]]*\bcolors\b/)).toEqual([]);
    expect(offenders(/transition-property\s*:[^;]*\bcolors\b/)).toEqual([]);
  });

  it("Tailwind's built-in hover variant is redefined onto the real-mouse attribute", () => {
    const css = scanned.find(({ path }) => path.endsWith("/src/styles/index.css"))?.text ?? "";
    expect(css).toMatch(/@custom-variant\s+hover\s*\([^)]*data-input="mouse"/);
    expect(css).toMatch(/@custom-variant\s+hover-fine\s*\([^)]*data-input="mouse"/);
  });
});

describe("the OS reduced-motion setting is never read", () => {
  it("no source asks the browser whether the visitor prefers reduced motion", () => {
    expect(offenders(/matchMedia\(\s*["'`][^"'`]*prefers-reduced-motion/)).toEqual([]);
    expect(offenders(/@media[^{]*prefers-reduced-motion/)).toEqual([]);
    expect(offenders(/REDUCED_MOTION_QUERY/)).toEqual([]);
  });

  it("the off state freezes keyframe animations but never touches transitions", () => {
    const css = scanned.find(({ path }) => path.endsWith("/src/styles/index.css"))?.text ?? "";
    const rule = css.match(/\[data-motion="off"\][^{]*\{[^}]*\}/g) ?? [];
    expect(rule.length).toBeGreaterThan(0);
    for (const block of rule) expect(block).not.toMatch(/transition/i);
    expect(rule.join("\n")).toMatch(/animation-duration/);
  });

  it("the off state also zeroes animation-delay, so a frozen page is in its final state at once (no blank flash)", () => {
    const css = scanned.find(({ path }) => path.endsWith("/src/styles/index.css"))?.text ?? "";
    const rule = (css.match(/\[data-motion="off"\][^{]*\{[^}]*\}/g) ?? []).join("\n");
    expect(rule).toMatch(/animation-delay:\s*0s/);
  });
});
