import { test, expect } from "@playwright/test";
import { animationsOnState } from "./support/motion";
import {
  HEX,
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
 * that hover survives it. Blocks that need the animated site opt in with animationsOnState.
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

test.describe("the Download CV button", () => {
  test.beforeEach(() => test.skip(desktopOnly(), "hover is desktop-only"));

  const CARD = '[data-bento-area="actions"]';
  const LINK = `${CARD} a`;
  const FACE = `${LINK} .cv-face`;

  test("the face lifts and grows its glow on hover, animating (not snapping), and never dims", async ({ page }) => {
    await open(page);
    // The properties that change on hover must be the ones in the transition. Tailwind 4 lifts with `translate`,
    // so a list naming only `transform` makes the lift snap.
    const property = await style(page, FACE, "transition-property");
    expect(property).toContain("translate");
    expect(property).toContain("box-shadow");
    expect(allNonZero(await style(page, FACE, "transition-duration"))).toBe(true);

    const restShadow = await style(page, FACE, "box-shadow");
    await page.locator(LINK).hover();
    await expect.poll(() => style(page, FACE, "translate")).toMatch(/-2px/);
    await expect.poll(() => style(page, FACE, "box-shadow")).not.toBe(restShadow);
    expect(await style(page, FACE, "opacity")).toBe("1");
    // The link itself never moves: that is what keeps the hover area still under the cursor.
    expect(await style(page, LINK, "translate")).toBe("none");
  });

  test("its card does not clip, so the glow can fade out instead of ending in a hard edge", async ({ page }) => {
    await open(page);
    expect(await style(page, CARD, "overflow")).toBe("visible");
  });

  test("the card is still exactly as tall as the pill, so the centre column does not shift", async ({ page }) => {
    await open(page);
    const card = (await page.locator(CARD).boundingBox())!;
    const face = (await page.locator(FACE).boundingBox())!;
    expect(Math.abs(card.height - face.height)).toBeLessThan(1);
  });

  test("a cursor wobbling on the pill's bottom edge does not make the hover flicker", async ({ page }) => {
    await open(page);
    const link = page.locator(LINK);
    const box = (await link.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height - 1; // 1px inside the bottom edge
    await page.mouse.move(x, y);
    let flips = 0;
    let last: boolean | null = null;
    for (let i = 0; i < 30; i += 1) {
      await page.mouse.move(x + (i % 2 ? 1 : -1), y + (i % 3 === 0 ? 0.4 : -0.4));
      await page.waitForTimeout(40);
      const hovered = await link.evaluate((el) => el.matches(":hover"));
      if (last !== null && hovered !== last) flips += 1;
      last = hovered;
    }
    expect(flips, "hover flipped on and off while the cursor stayed on the pill").toBeLessThanOrEqual(1);
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

  test.describe("and the Animations toggle switched ON by the visitor", () => {
    test.use({ reducedMotion: "reduce", storageState: async ({ baseURL }, provide) => provide(animationsOnState(baseURL!)) });
    test("hover animates AND ambient motion still runs: the OS setting is ignored", async ({ page }) => {
      await open(page);
      expect(await page.locator("html").getAttribute("data-motion")).toBe("on");
      // Ambient keyframes run at their authored speed (160s drift), not frozen to ~0.
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
