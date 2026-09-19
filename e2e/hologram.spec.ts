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
  // Software-rendered WebGL is slow to mount; two parallel workers can starve it past 30s.
  test.describe.configure({ timeout: 120_000 });

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

/**
 * Regression guard for the "hologram is off-centre on the live site" bug.
 *
 * The window is scaled as a unit with `transform: scale(s)`. r3f measured the
 * canvas with getBoundingClientRect() — which includes that transform — and
 * wrote the already-scaled size back onto the canvas as CSS pixels, so the
 * parent transform shrank it a SECOND time (visible canvas = layout × s²,
 * anchored top-left). It only shows below ~1248×818, where s < 1 — which is why
 * it went unnoticed at 1440×900. Measured on production before the fix:
 * canvas ÷ container = 1.000 @1440×900, 0.935 @1366×768, 0.873 @1280×720.
 */
test.describe("hologram at a scaled viewport", () => {
  test.use({ reducedMotion: "reduce" });
  // Software-rendered WebGL is slow to mount and CI runs specs in parallel: the
  // canvas mount (up to 30s) plus the settle poll must fit inside the test budget.
  test.describe.configure({ timeout: 120_000 });

  async function boxes(page: import("@playwright/test").Page) {
    const host = page.locator('[data-pass-variant="webgl"]');
    const canvas = host.locator("canvas");
    await expect(canvas, "the WebGL canvas never mounted").toHaveCount(1, { timeout: 30_000 });
    return { host, canvas };
  }

  for (const [width, height] of [
    [1440, 900], // scale 1 — always worked
    [1366, 768], // the common laptop
    [1280, 720],
  ] as const) {
    test(`the canvas fills its container at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await page.locator('[data-bento-area="pass"]').waitFor();
      const { host, canvas } = await boxes(page);

      // r3f resizes on the next measure, so poll rather than sample once.
      await expect
        .poll(
          async () => {
            const h = (await host.boundingBox())!;
            const c = (await canvas.boundingBox())!;
            // The worst of the four edges' disagreement, in px.
            return Math.max(
              Math.abs(h.width - c.width),
              Math.abs(h.height - c.height),
              Math.abs(h.x - c.x),
              Math.abs(h.y - c.y),
            );
          },
          { timeout: 15_000, message: "canvas is not the size of its container (double-scaled?)" },
        )
        .toBeLessThan(2);
    });
  }

  test("the canvas is centred in the stage at a scaled viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.locator('[data-bento-area="pass"]').waitFor();
    const { canvas } = await boxes(page);
    await expect
      .poll(
        async () => {
          const stage = (await page.locator('[data-bento-area="pass"]').boundingBox())!;
          const c = (await canvas.boundingBox())!;
          return Math.abs(stage.x + stage.width / 2 - (c.x + c.width / 2));
        },
        { timeout: 15_000 },
      )
      .toBeLessThan(1.5);
  });
});
