import { test, expect, type Page } from "@playwright/test";
import { animationsOnState } from "./support/motion";

/**
 * The Animations toggle. Off by default for everyone (the OS reduced-motion setting is never read); switching it on
 * runs AMBIENT motion only. Hover and focus transitions are locked on in both states (see hover.spec.ts).
 *
 * The suite itself runs with the toggle stored OFF (playwright.config.ts). A block that tests the first-visit default
 * opts out with NO_STORAGE; a block that needs the real, animated site opts in with animationsOnState.
 */
const NO_STORAGE = { cookies: [], origins: [] };
const TOGGLE = '[data-testid="motion-toggle"]';
const THEME = '[data-testid="theme-toggle"]';

const desktopOnly = () => test.info().project.name !== "chromium";

const longest = (durations: string) => Math.max(...durations.split(",").map((d) => parseFloat(d)));
const stars = (page: Page) =>
  page.locator(".stars").evaluate((el) => getComputedStyle(el).animationDuration);

const starsNear = (page: Page) =>
  page.locator(".stars-near").evaluate((el) => getComputedStyle(el).animationDuration);
const galaxyGlow = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.querySelector(".galaxy")!, "::before").animationDuration);

/** A tall strip down the left edge: only the backdrop paints there (the window is centred); used to prove it is frozen when off. */
async function galaxyStrip(page: Page) {
  return page.screenshot({ clip: { x: 0, y: 0, width: 110, height: 700 } });
}

test.describe("the Animations toggle", () => {
  test.use({ storageState: NO_STORAGE });

  test("is visible, named 'Animations', NOT pressed by default, and does not depend on the OS setting", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();
    await expect(page.getByRole("button", { name: "Animations" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  });

  test("sits directly next to the day/night toggle, on one axis, not overlapping it", async ({ page }) => {
    await page.goto("/");
    const theme = (await page.locator(THEME).boundingBox())!;
    const motion = (await page.locator(TOGGLE).boundingBox())!;
    // (`desktopOnly()` reads inverted: it is true when this is NOT the desktop project, which is what test.skip wants.)
    const onPhone = desktopOnly();
    if (onPhone) {
      // A phone: the pair is a ROW pinned bottom-right (`.toggle-dock`, styles/index.css), so it never covers the
      // intro card. Animations sits to the right of day/night on one horizontal line.
      expect(motion.x).toBeGreaterThanOrEqual(theme.x + theme.width); // beside, never overlapping
      expect(motion.x - (theme.x + theme.width)).toBeLessThan(16); // a gap, not a separate island
      expect(Math.abs(motion.y + motion.height / 2 - (theme.y + theme.height / 2))).toBeLessThan(1); // one axis
    } else {
      // Desktop: a COLUMN top-right, Animations directly below day/night on one vertical line (approved design).
      expect(motion.y).toBeGreaterThanOrEqual(theme.y + theme.height); // below, never overlapping
      expect(motion.y - (theme.y + theme.height)).toBeLessThan(16); // a gap, not a separate island
      expect(Math.abs(motion.x + motion.width / 2 - (theme.x + theme.width / 2))).toBeLessThan(1); // one axis
    }
  });

  test("switching it on sticks across a reload", async ({ page }) => {
    await page.goto("/");
    await page.locator(TOGGLE).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    expect(await page.evaluate(() => localStorage.getItem("mclector-motion"))).toBe("on");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "true");
    expect(await stars(page).then(longest)).toBeGreaterThan(1);
  });

  test("is keyboard operable", async ({ page }) => {
    await page.goto("/");
    await page.locator(TOGGLE).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Space");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("the Animations toggle, switched on", () => {
  test.use({ storageState: async ({ baseURL }, provide) => provide(animationsOnState(baseURL!)) });

  test("off freezes the ambient layer; on brings it back — live, no reload", async ({ page }) => {
    test.skip(desktopOnly(), "the galaxy strip is only free of content at desktop widths");
    await page.goto("/");

    // ON: the star layers drift slowly and the galaxy glow breathes (too slow for a pixel diff, so read computed styles).
    const expectOn = async () => {
      await expect.poll(() => stars(page).then(longest)).toBeGreaterThan(100); // 160s drift
      await expect.poll(() => starsNear(page).then(longest)).toBeGreaterThan(60);
      await expect.poll(() => galaxyGlow(page)).toBe("30s");
    };
    await expectOn();

    // OFF
    await page.locator(TOGGLE).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "false");
    expect(await stars(page).then(longest)).toBeLessThan(0.01);
    expect(await starsNear(page).then(longest)).toBeLessThan(0.01);
    expect(longest(await galaxyGlow(page))).toBeLessThan(0.01);
    await page.waitForTimeout(300); // let the last in-flight frame land
    const c = await galaxyStrip(page);
    await page.waitForTimeout(700);
    const d = await galaxyStrip(page);
    expect(c.equals(d), "the backdrop kept moving with animations off").toBe(true);

    // ON again
    await page.locator(TOGGLE).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    await expectOn();
  });

  test("the horizon hairline stays 4% above the bottom edge", async ({ page }) => {
    test.skip(desktopOnly(), "desktop project only");
    for (const height of [600, 1200]) {
      await page.setViewportSize({ width: 1440, height });
      await page.goto("/");
      const box = await page.locator(".horizon-line").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { y: r.y, height: r.height };
      });
      const bottom = box.y + box.height;
      expect(Math.abs(bottom - 0.96 * height), `hairline bottom at viewport height ${height}`).toBeLessThanOrEqual(2);
      expect(bottom).toBeLessThanOrEqual(height);
      expect(box.y).toBeGreaterThanOrEqual(0);
    }
  });

  test("the fixed layers do not create a horizontal scrollbar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.inner);
  });

  test("remembers switching it off across a reload", async ({ page }) => {
    await page.goto("/");
    await page.locator(TOGGLE).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    expect(await page.evaluate(() => localStorage.getItem("mclector-motion"))).toBe("off");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "false");
    expect(await stars(page).then(longest)).toBeLessThan(0.01);
  });

  test("switching off never zeroes a hover transition", async ({ page }) => {
    test.skip(desktopOnly(), "hover is desktop-only");
    await page.goto("/");
    await page.locator(TOGGLE).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    const link = page.locator('[data-bento-area="social"] a.hexgrid__link').first();
    const duration = await link.evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration.split(",").every((d) => parseFloat(d) > 0)).toBe(true);
  });
});
