import { test, expect } from "@playwright/test";

/**
 * Regression guard for the bug that started the redesign: a visitor with
 * `prefers-reduced-motion` (or a modest GPU) was shown the FLAT 2D card instead
 * of the 3D object, because the capability gate conflated "render 3D" with
 * "animate 3D".
 *
 * This is the only spec that runs with WebGL available (the `webgl` project in
 * playwright.config.ts); every other spec runs with 3D APIs disabled so the
 * page settles deterministically. It asserts the hologram HOST mounts and holds
 * a <canvas> — not pixels: headless software GL cannot settle the scene, and
 * the live look is checked on a real GPU.
 */
test.describe("hologram under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders the WebGL hologram, not the flat 2D card", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('[data-bento-area="pass"]').waitFor();

    const host = page.locator('[data-pass-variant="webgl"]');
    await expect(host, "the WebGL hologram never mounted").toHaveCount(1, { timeout: 30_000 });
    await expect(host.locator("canvas")).toHaveCount(1);

    // ...and the static fallback is NOT what is showing.
    await expect(page.locator('[data-pass-variant="static"]')).toHaveCount(0);
  });
});
