import { test, expect } from "@playwright/test";
import {
  HEX,
  NO_STORAGE,
  PROJECT_ROW,
  SKILL,
  allNonZero,
  expectHoverWorks,
  longest,
  open,
  style,
} from "./support/hover";

/**
 * HOVER IS LOCKED ON. Every hover / focus transition works for every visitor, whatever the browser claims about
 * its pointer, and whatever the OS or the site's own Animations toggle says about motion.
 *
 * The bug this guards (item 4 of round 3): on the owner's laptop, in Chrome AND Brave, nothing happened on hover:
 * the skill tiles, the sign and the hexagons were dead, and the hexagons showed every name permanently. Hover was
 * gated by `@media (hover: hover) and (pointer: fine)`, which asks the browser what the DEVICE is, and that laptop
 * answered wrongly for the mouse in use. The mode is now decided by real pointer events (`html[data-input]`).
 * The browser-that-lies case has its own file (no-hover-browser.spec.ts): Playwright only allows `launchOptions`
 * at the top level of a spec file.
 *
 * The whole suite runs with the Animations toggle OFF (playwright.config.ts), so these tests double as the proof
 * that hover survives it. Blocks that need the animated site opt out with NO_STORAGE.
 */
const desktopOnly = () => test.info().project.name !== "chromium";
const mobileOnly = () => test.info().project.name !== "mobile-chrome";

test.describe("with a real mouse", () => {
  test.beforeEach(() => test.skip(desktopOnly(), "hover is desktop-only"));

  test("hexagons, skill tiles and the sign all animate on hover (animations toggle OFF, as the suite runs)", async ({ page }) => {
    await open(page);
    expect(await page.locator("html").getAttribute("data-motion")).toBe("off");
    await expectHoverWorks(page);
  });

  test("a project row's colour really FADES: the transition names properties that exist", async ({ page }) => {
    await open(page);
    const property = await style(page, PROJECT_ROW, "transition-property");
    expect(property).not.toMatch(/\bcolors\b/);
    expect(property).toContain("background-color");
    const rest = await style(page, PROJECT_ROW, "background-color");
    await page.locator(PROJECT_ROW).first().hover();
    await expect.poll(() => style(page, PROJECT_ROW, "background-color")).not.toBe(rest);
    expect(allNonZero(await style(page, PROJECT_ROW, "transition-duration"))).toBe(true);
  });
});

test.describe("with the OS reduced-motion setting ON", () => {
  test.beforeEach(() => test.skip(desktopOnly(), "hover is desktop-only"));

  test.describe("and the Animations toggle off", () => {
    test.use({ reducedMotion: "reduce" });
    test("hover still animates", async ({ page }) => {
      await open(page);
      await expectHoverWorks(page);
    });
  });

  test.describe("and the Animations toggle ON (the default)", () => {
    test.use({ reducedMotion: "reduce", storageState: NO_STORAGE });
    test("hover animates AND ambient motion still runs: the OS setting is ignored", async ({ page }) => {
      await open(page);
      expect(await page.locator("html").getAttribute("data-motion")).toBe("on");
      // Ambient keyframes run at their authored speed (5.5s twinkle, 140s drift), not frozen to ~0.
      expect(longest(await style(page, ".stars", "animation-duration"))).toBeGreaterThan(1);
      await expectHoverWorks(page);
    });
  });
});

test.describe("a touch visitor", () => {
  test.beforeEach(() => test.skip(mobileOnly(), "touch behaviour is checked on the phone project"));

  test("sees every hexagon name at rest, and a tap leaves no sticky hover behind", async ({ page }) => {
    await open(page);
    await expect(page.locator("html")).toHaveAttribute("data-input", "touch");
    const labels = page.locator(`${HEX} .hexgrid__label`);
    for (let i = 0; i < 7; i += 1) await expect(labels.nth(i)).toHaveCSS("opacity", "1");

    const tile = page.locator(SKILL).first();
    await tile.scrollIntoViewIfNeeded();
    await tile.tap();
    await page.waitForTimeout(400); // longer than the 150ms transition: a sticky hover would have lifted by now
    // Tapping must not switch hover on: still touch, and the tile has not been left lifted.
    await expect(page.locator("html")).toHaveAttribute("data-input", "touch");
    expect(await style(page, SKILL, "translate")).toMatch(/^(none|0px( 0px)?)$/);
  });
});
