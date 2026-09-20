import { test, expect, type Page } from "@playwright/test";

/**
 * The Animations toggle. On by default for everyone (the OS reduced-motion setting is never read); switching it off
 * freezes AMBIENT motion only. Hover and focus transitions are locked on in both states (see hover.spec.ts).
 *
 * The suite itself runs with the toggle OFF (playwright.config.ts), so every block here that needs the real,
 * animated site opts out with NO_STORAGE.
 */
const NO_STORAGE = { cookies: [], origins: [] };
const TOGGLE = '[data-testid="motion-toggle"]';
const THEME = '[data-testid="theme-toggle"]';

const desktopOnly = () => test.info().project.name !== "chromium";

const longest = (durations: string) => Math.max(...durations.split(",").map((d) => parseFloat(d)));
const stars = (page: Page) =>
  page.locator(".stars").evaluate((el) => getComputedStyle(el).animationDuration);

/** A tall strip down the left edge: only the galaxy paints there (the window is centred), so it shows rain, stars and rocks. */
async function galaxyStrip(page: Page) {
  return page.screenshot({ clip: { x: 0, y: 0, width: 110, height: 700 } });
}

test.describe("the Animations toggle", () => {
  test.use({ storageState: NO_STORAGE });

  test("is visible, named 'Animations', pressed by default, and does not depend on the OS setting", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();
    await expect(page.getByRole("button", { name: "Animations" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
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

  test("off freezes the ambient layer; on brings it back — live, no reload", async ({ page }) => {
    test.skip(desktopOnly(), "the galaxy strip is only free of content at desktop widths");
    await page.goto("/");
    await expect.poll(() => stars(page).then(longest)).toBeGreaterThan(1); // twinkle 5.5s, drift 140s

    // ON: the falling code / stars / rocks are moving, so two frames apart differ.
    const a = await galaxyStrip(page);
    await page.waitForTimeout(700);
    const b = await galaxyStrip(page);
    expect(a.equals(b), "the galaxy did not animate while animations were on").toBe(false);

    // OFF
    await page.locator(TOGGLE).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "false");
    expect(await stars(page).then(longest)).toBeLessThan(0.01);
    await page.waitForTimeout(300); // let the last in-flight frame land
    const c = await galaxyStrip(page);
    await page.waitForTimeout(700);
    const d = await galaxyStrip(page);
    expect(c.equals(d), "the galaxy kept moving with animations off").toBe(true);

    // ON again
    await page.locator(TOGGLE).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    await expect.poll(() => stars(page).then(longest)).toBeGreaterThan(1);
    const e = await galaxyStrip(page);
    await page.waitForTimeout(700);
    const f = await galaxyStrip(page);
    expect(e.equals(f), "the galaxy did not resume after switching back on").toBe(false);
  });

  test("remembers the choice across a reload", async ({ page }) => {
    await page.goto("/");
    await page.locator(TOGGLE).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    expect(await page.evaluate(() => localStorage.getItem("mclector-motion"))).toBe("off");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "false");
    expect(await stars(page).then(longest)).toBeLessThan(0.01);
  });

  test("is keyboard operable", async ({ page }) => {
    await page.goto("/");
    await page.locator(TOGGLE).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Space");
    await expect(page.locator(TOGGLE)).toHaveAttribute("aria-pressed", "true");
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
