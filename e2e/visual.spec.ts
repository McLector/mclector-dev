import { test, expect } from "@playwright/test";

/**
 * Stream G — visual regression baselines for the whole page.
 *
 * MASKING: the `pass` area hosts the 3D lanyard scene (Stream C). That card
 * is a WebGL canvas driven by a physics simulation, so its pixels are
 * non-deterministic between runs (and differ by GPU/swiftshader build).
 * It is masked out of both baselines via Playwright's `mask` option so the
 * baseline stays stable once Stream C lands and starts animating. Everything
 * outside that rectangle is still compared pixel-for-pixel.
 *
 * Animations are frozen (`animations: "disabled"`) so the gradient backdrop
 * pan in src/styles/index.css cannot shift the baseline either.
 *
 * Baselines are captured on the desktop chromium project only; the
 * mobile-chrome project emulates a different DPR/device, which would double
 * the snapshot set without adding coverage — the mobile viewport is covered
 * here by resizing instead.
 */
test.skip(
  () => test.info().project.name !== "chromium",
  "screenshot baselines are captured on the desktop chromium project only",
);

const maskedRegions = (page: import("@playwright/test").Page) => [
  page.locator('[data-bento-area="pass"]'),
];

test.describe("visual baselines", () => {
  test("desktop 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('[data-bento-area="certifications"]').waitFor();
    await expect(page).toHaveScreenshot("home-desktop.png", {
      fullPage: true,
      animations: "disabled",
      mask: maskedRegions(page),
      maxDiffPixelRatio: 0.01,
    });
  });

  test("mobile 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator('[data-bento-area="certifications"]').waitFor();
    await expect(page).toHaveScreenshot("home-mobile.png", {
      fullPage: true,
      animations: "disabled",
      mask: maskedRegions(page),
      maxDiffPixelRatio: 0.01,
    });
  });
});
