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
 * Animations are frozen (`animations: "disabled"`) so the wallpaper drift and
 * nebula-glow animations in src/styles/index.css cannot shift the baseline.
 *
 * DETERMINISM: the visual baseline runs under emulated `prefers-reduced-motion`.
 * That resolves the capability tier to `unsupported`, so the (masked) `pass`
 * cell renders the STATIC BadgeFallback instead of the live WebGL canvas. The
 * canvas re-renders every frame (physics + an always-moving starfield), so the
 * page never reaches the "two identical frames" stability `toHaveScreenshot`
 * requires — the badge is masked out of the comparison anyway, so forcing its
 * static twin here only buys a stable page, it does not reduce coverage.
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
  // The live local-time clock (src/features/location/LocationCard.tsx)
  // ticks once a second, which made this baseline non-deterministic —
  // it wasn't masked originally because LocationCard was still a static
  // Phase-0 placeholder when this spec was written.
  page.locator('[data-bento-area="place"]'),
];

test.describe("visual baselines", () => {
  test("desktop 1440x900", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
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
    await page.emulateMedia({ reducedMotion: "reduce" });
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
