import { test, expect } from "@playwright/test";

/**
 * Visual regression baselines for the whole framed window.
 *
 * MASKING: the `pass` area hosts the 3D hologram. Its pixels are
 * non-deterministic (a WebGL canvas, and it differs by GPU/swiftshader build),
 * so it is masked out of both baselines and everything outside that rectangle
 * is compared pixel-for-pixel. The `place` area is masked too: its clock ticks.
 *
 * Animations are frozen (`animations: "disabled"`) so the galaxy drift and
 * nebula animations in src/styles/index.css cannot shift the baseline.
 *
 * DETERMINISM: the suite runs with 3D APIs disabled and reduced motion
 * (playwright.config.ts), so the hologram cell settles on the static fallback
 * card instead of a canvas that never reaches the "two identical frames"
 * stability `toHaveScreenshot` requires. It is masked anyway, so this only buys
 * a stable page, not less coverage.
 *
 * THEME: each baseline pins `data-theme` explicitly (stored choice) so the
 * snapshot never depends on the OS colour-scheme fallback. Dark is the default
 * look; a light (twilight) desktop baseline covers the second theme.
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

/** Persist the theme choice before first paint (mirrors ThemeToggle). */
async function pinTheme(page: import("@playwright/test").Page, theme: "dark" | "light") {
  await page.addInitScript((t) => localStorage.setItem("mclector-theme", t), theme);
}

test.describe("visual baselines", () => {
  test("desktop 1440x900", async ({ page }) => {
    await pinTheme(page, "dark");
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

  test("desktop 1440x900 — twilight (light)", async ({ page }) => {
    await pinTheme(page, "light");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('[data-bento-area="certifications"]').waitFor();
    await expect(page).toHaveScreenshot("home-desktop-light.png", {
      fullPage: true,
      animations: "disabled",
      mask: maskedRegions(page),
      maxDiffPixelRatio: 0.01,
    });
  });

  test("mobile 390x844", async ({ page }) => {
    await pinTheme(page, "dark");
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
