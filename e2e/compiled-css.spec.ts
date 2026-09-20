import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Guards on the BUILT stylesheet: the thing visitors' browsers actually receive.
 *
 * Every one of these was a real bug, and none was visible in source review or in a test that ran with the OS
 * animation setting emulated:
 *  - hover rules sat behind `@media (hover: hover) and (pointer: fine)`, which a touchscreen laptop fails while a
 *    real mouse is attached, so hover never fired and the social hexagons showed their names permanently;
 *  - a blanket reduced-motion rule forced every transition to ~0ms, so hover snapped instead of animating;
 *  - an arbitrary transition value named `colors`, which is not a CSS property, so colours never faded.
 *
 * Tailwind builds hover utilities into media queries unless told otherwise, and it scans every file in the repo,
 * so a source-level check alone cannot prove what shipped. This one reads the compiled output.
 *
 * It does NOT scan the JS bundle: the `motion` animation library reads the reduced-motion query internally, but its
 * default `reducedMotion: "never"` config ignores the answer, and nothing in this app overrides it.
 */
test.skip(() => test.info().project.name !== "chromium", "static asset checks run once, on the desktop project");

async function builtCss(request: APIRequestContext): Promise<string> {
  const html = await (await request.get("/")).text();
  const href = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/)?.[1];
  expect(href, "index.html links no stylesheet").toBeTruthy();
  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  return res.text();
}

test.describe("the built stylesheet", () => {
  test("has no hover or pointer media query anywhere", async ({ request }) => {
    const css = await builtCss(request);
    expect(css.length).toBeGreaterThan(10_000); // a real stylesheet, not an error page
    expect(css).not.toMatch(/hover\s*:\s*hover/);
    expect(css).not.toMatch(/hover\s*:\s*none/);
    expect(css).not.toMatch(/pointer\s*:\s*(fine|coarse)/);
  });

  test("has no reduced-motion rule: the OS setting is never read", async ({ request }) => {
    expect(await builtCss(request)).not.toContain("prefers-reduced-motion");
  });

  test("has no transition on a property that does not exist", async ({ request }) => {
    const css = await builtCss(request);
    // `colors` is not a CSS property; `transition-property: colors, ...` silently matches nothing.
    expect(css).not.toMatch(/transition-property\s*:[^;}]*\bcolors\b/);
  });

  test("keys hover to the real-mouse attribute, for hover:, group-hover: and the hand-written rules alike", async ({
    request,
  }) => {
    const css = await builtCss(request);
    // The minifier may drop the quotes around the attribute value, so accept both spellings.
    const keyed = css.match(/data-input=("?)mouse\1/g) ?? [];
    expect(keyed.length, "hover rules are not keyed to html[data-input=mouse]").toBeGreaterThan(10);
    // Tailwind built `group-hover:` on top of the overridden `hover` variant (checked, not assumed).
    expect(css).toMatch(/group-hover\\:[^{]*:where\(:root\[data-input=("?)mouse\1\] \*\)/);
    // A skill tile lift (the `hover-fine:` alias), the hexagon lift, and a plain `hover:` utility.
    // (The CSS escapes the dot in the class name: `.hover-fine\:-translate-y-0\.5`.)
    expect(css).toMatch(/hover-fine\\:-translate-y-0\\?\.5[^{]*data-input=("?)mouse\1/);
    expect(css).toMatch(/hexgrid__link:hover/);
    expect(css).toMatch(/\.hover\\:opacity-90[^{]*data-input=("?)mouse\1/);
  });

  test("freezes ambient keyframes when animations are off, and never touches transitions in that rule", async ({
    request,
  }) => {
    const css = await builtCss(request);
    const rules = css.match(/[^{}]*data-motion=("?)off\1[^{}]*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.join("\n")).toMatch(/animation-duration/);
    expect(rules.join("\n")).not.toMatch(/transition/);
  });
});
