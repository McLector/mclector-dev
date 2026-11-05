import { test, expect, type Page } from "@playwright/test";

/**
 * Regression guard for the bug that started the redesign: a visitor with
 * the reduced-motion setting (or a modest GPU) was shown the FLAT 2D card instead
 * of the 3D object, because the capability gate conflated "render 3D" with
 * "animate 3D". The site no longer reads the OS setting. The visible Animations toggle (OFF for this whole
 * suite, see playwright.config.ts) governs the backdrop only: the hologram ignores it and must still render.
 *
 * This is the only spec that runs with WebGL available (the `webgl` project in
 * playwright.config.ts); every other spec runs with 3D APIs disabled so the
 * page settles deterministically. It asserts the hologram HOST mounts and holds
 * a <canvas> — not pixels: headless software GL cannot settle the scene, and
 * the live look is checked on a real GPU.
 */
test.describe("hologram with the animations toggle off", () => {
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

/**
 * Pixel guards for the PICTURE on the card. The rest of this file proves the canvas mounts and is
 * sized; nothing above would notice if the portrait rendered as flat cyan, veiled white, or if
 * the back face were an opaque slab. The hologram follows its own capability gate, not the Animations toggle, so a
 * capable machine spins the card and the picture would never hold still. The test therefore reports 2 CPU cores:
 * that is the low tier, which renders the scene STATIC (rotation 0, t = 0, no autonomous motion), so its pixels are
 * deterministic. (The low tier also turns antialiasing off and caps dpr at 1; the numbers below are measured that way.)
 *
 * Every threshold was CALIBRATED by breaking the thing and measuring, not assumed. Canvas is
 * 546×596 at 1440×900. The scene is the borderless corners-only card on the reference projector, seen from 12°
 * above. It runs in BOTH themes, because they are different looks: the dark theme's deep-navy bay (added light), and
 * the light theme's pale glass bay (ink). Each is pinned in the test.
 *
 *                              nonBlue%   lumaP5   back margins (mean luma)
 *   dark, as approved            7.77      46.9      31-35                  (face 144: contrast +108)
 *   light, as approved           6.29      67.5      218-223 (the pale bay) (face 149: margins brighter by +69)
 *   colour off (uColor 0)        0.00      45.4        —                     (measured in the earlier navy light theme)
 *   legacy veiled scan band      1.32     147.4        —                     (measured on the previous bezel framing)
 *   opaque back photo             —         —        204–223 (a bright slab; the face was 106; previous bezel framing)
 *
 * (The last three rows were measured earlier and not repeated; they are far from the thresholds below, which sit
 * between the approved rows and them. On the light bay the back face's margins are as bright as a leftover photo
 * background would be, so only the dark run can tell an opaque slab from a cutout by brightness.)
 *
 * (Switching the mask off ALONE changes nothing — under a real cutout the texture is black behind the
 * transparent pixels, so the luminance alpha hides them anyway. The regression that matters is shipping the
 * OPAQUE photo, which is the last row, and which src/assets/formalPic.test.ts also pins at the file level.)
 */
type Region = readonly [x0: number, x1: number, y0: number, y1: number];
type Stats = { meanLuma: number; lumaP5: number; nonBluePct: number };

/**
 * Fractions of the canvas. The photo area of the front screen (inside its soft edge); and the empty margins beside
 * the bust, inside the card's bounds, and the face on the back.
 */
const PHOTO: Region = [0.31, 0.69, 0.11, 0.53];
const BACK_MARGINS: Record<string, Region> = {
  topLeft: [0.3, 0.34, 0.1, 0.16],
  topRight: [0.66, 0.7, 0.1, 0.16],
  leftSide: [0.3, 0.34, 0.25, 0.37],
  rightSide: [0.655, 0.7, 0.25, 0.37],
};
const FACE: Region = [0.46, 0.54, 0.3, 0.4];
/** Approved dark-theme margins measure 31–35. Set from the opaque-photo measurement above. */
const MASK_MARGIN_MAX = 100;

/** Decode a screenshot in the page (a canvas needs no image library) and measure regions of it. */
async function measure(page: Page, png: Buffer, regions: Record<string, Region>): Promise<Record<string, Stats>> {
  return page.evaluate(
    async ({ uri, regions }) => {
      const img = new Image();
      img.src = uri;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const out: Record<string, { meanLuma: number; lumaP5: number; nonBluePct: number }> = {};
      for (const [name, [x0, x1, y0, y1]] of Object.entries(regions)) {
        const [px0, px1, py0, py1] = [x0 * img.width, x1 * img.width, y0 * img.height, y1 * img.height].map(Math.round);
        const d = ctx.getImageData(px0, py0, px1 - px0, py1 - py0).data;
        const lumas: number[] = [];
        let nonBlue = 0;
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
          lumas.push(0.299 * r + 0.587 * g + 0.114 * b);
          if (r > b + 8 || g > b + 6) nonBlue++; // not blue-dominant: warm horizon, foliage, skin
        }
        lumas.sort((a, b) => a - b);
        out[name] = {
          meanLuma: lumas.reduce((s, v) => s + v, 0) / lumas.length,
          lumaP5: lumas[Math.floor(0.05 * (lumas.length - 1))],
          nonBluePct: (100 * nonBlue) / lumas.length,
        };
      }
      return out;
    },
    { uri: "data:image/png;base64," + png.toString("base64"), regions },
  );
}

for (const theme of ["dark", "light"] as const) {
test.describe(`hologram picture (${theme} theme)`, () => {
  // Static scene, with software-GL patience: each screenshot is slow.
  test.describe.configure({ timeout: 300_000 });

  // ONE test with steps: every mount is slow under software WebGL, so all three guards share one page.
  test("front shows real colour without a white veil; back is a cutout, not a slab", async ({ page }) => {
    // Pin the theme explicitly: this must not depend on any default or OS setting.
    await page.addInitScript((t) => localStorage.setItem("mclector-theme", t), theme);
    // Two cores is the low tier, which renders the scene static. See the note above.
    await page.addInitScript(() => Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 }));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const canvas = page.locator('[data-pass-variant="webgl"] canvas');
    await expect(canvas, "the WebGL canvas never mounted").toHaveCount(1, { timeout: 60_000 });

    const shoot = () => canvas.screenshot({ timeout: 120_000 });
    let front: Stats | undefined;

    await test.step("front: the photo's real colour reaches the screen", async () => {
      // The texture decodes after the canvas mounts, so poll until the picture is actually there.
      await expect
        .poll(
          async () => {
            front = (await measure(page, await shoot(), { photo: PHOTO })).photo;
            return front.nonBluePct;
          },
          {
            timeout: 120_000,
            intervals: [3_000],
            message: "no warm/green pixels: the portrait is rendering as the flat cyan ramp",
          },
        )
        .toBeGreaterThan(1.0); // approved 7.53, colour off 0.00
    });

    await test.step("front: no white veil over the portrait", async () => {
      // The legacy scan band added +0.5 white to every pixel, lifting the 5th-percentile luminance to ~147 (approved: 49).
      expect(front!.lumaP5, "the darkest 5% of the portrait is washed out — a white veil").toBeLessThan(105);
    });

    await test.step("back: the formal portrait is a cutout, not an opaque slab", async () => {
      // Drag the card ≈π (449 px × 0.007 rad/px), HOLDING the pointer down: there is no inertia while dragging.
      const box = (await canvas.boundingBox())!;
      const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
      await page.mouse.move(cx - 224.5, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 224.5 + 449, cy, { steps: 90 });
      try {
        const marginsOf = (m: Record<string, Stats>) => Object.keys(BACK_MARGINS).map((k) => m[k].meanLuma);
        let back!: Record<string, Stats>;
        // Poll the bust's CONTRAST with its margins, not the margins alone: an empty stage looks like the margins
        // too, so "margins that look right" would pass before the back texture had even loaded. On the dark bay
        // the face is BRIGHTER than the margins; on the pale light bay it is DARKER, so the sign flips.
        await expect
          .poll(
            async () => {
              back = await measure(page, await shoot(), { ...BACK_MARGINS, face: FACE });
              return theme === "dark"
                ? back.face.meanLuma - Math.max(...marginsOf(back))
                : Math.min(...marginsOf(back)) - back.face.meanLuma;
            },
            {
              timeout: 120_000,
              intervals: [3_000],
              message: "no bust stands out from the back face's margins: an opaque slab, or nothing loaded",
            },
          )
          .toBeGreaterThan(20); // approved ≈ +100
        // The margins-are-dark check only means something on the dark bay. On the pale bay a leftover photo
        // background is as bright as the bay itself, so an opaque slab cannot be told apart by brightness there:
        // the dark-theme run guards it (and src/assets/formalPic.test.ts pins the matte in the file).
        if (theme === "dark") {
          for (const name of Object.keys(BACK_MARGINS)) {
            expect(back[name].meanLuma, `back margin "${name}" is bright — the background was not removed`).toBeLessThan(
              MASK_MARGIN_MAX,
            );
          }
        }
      } finally {
        await page.mouse.up();
      }
    });
  });
});
}
