import { test, expect, type Page } from "@playwright/test";

/**
 * The centre column is sign → Download CV → stage, all on ONE vertical axis
 * (the approved mockup measured sign centre x == Download CV centre x).
 * Layout assertions run on the desktop project only.
 */
test.skip(
  () => test.info().project.name !== "chromium",
  "viewport-driven layout assertions run on the desktop project only",
);

const SIGN = '[data-bento-area="connect"]';
const STAGE = '[data-bento-area="pass"]';
const ACTIONS = '[data-bento-area="actions"]';

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await page.locator(SIGN).waitFor();
}

const centreX = (b: { x: number; width: number }) => b.x + b.width / 2;

test.describe("centre column", () => {
  for (const [w, h] of [
    [1440, 900],
    [1280, 720],
    [1366, 768],
  ] as const) {
    test(`sign, stage and Download CV share one vertical axis at ${w}x${h}`, async ({ page }) => {
      await open(page, w, h);
      const sign = (await page.locator(SIGN).boundingBox())!;
      const stage = (await page.locator(STAGE).boundingBox())!;
      const cv = (await page.locator(`${ACTIONS} button, ${ACTIONS} a`).first().boundingBox())!;
      expect(Math.abs(centreX(sign) - centreX(cv)), "sign vs Download CV").toBeLessThan(1);
      expect(Math.abs(centreX(stage) - centreX(cv)), "stage vs Download CV").toBeLessThan(1);
    });
  }

  test("stacks sign above Download CV above the stage", async ({ page }) => {
    await open(page, 1440, 900);
    const sign = (await page.locator(SIGN).boundingBox())!;
    const cv = (await page.locator(ACTIONS).boundingBox())!;
    const stage = (await page.locator(STAGE).boundingBox())!;
    expect(sign.y + sign.height).toBeLessThanOrEqual(cv.y + 1);
    expect(cv.y + cv.height).toBeLessThanOrEqual(stage.y + 1);
  });

  test("moving Download CV up does not resize the hologram stage (the canvas size feeds fitCamera)", async ({ page }) => {
    // Round 2 measured the stage at 630px with the neon sign 42px tall and the button under it. The reorder alone
    // must not change that, or the hologram canvas and its already-flaky size predicates would move.
    await open(page, 1440, 900);
    const stage = (await page.locator(STAGE).boundingBox())!;
    expect(Math.round(stage.height)).toBe(630);
  });

  test("the stage sits flush with the bottom of the neighbouring columns", async ({ page }) => {
    await open(page, 1440, 900);
    // Poll: measure once the cards have settled, not mid-entrance.
    await expect
      .poll(async () => {
        const stage = (await page.locator(STAGE).boundingBox())!;
        const place = (await page.locator('[data-bento-area="place"]').boundingBox())!;
        return Math.abs(stage.y + stage.height - (place.y + place.height));
      })
      .toBeLessThan(1.5);
  });

  test("the sign opens Gmail compose in a new tab, and there is no Contact me button", async ({ page }) => {
    await open(page, 1440, 900);
    const sign = page.locator(SIGN);
    await expect(sign).toBeVisible();
    // Not a mailto: — that does nothing on a machine with no mail app registered.
    await expect(sign).toHaveAttribute(
      "href",
      "https://mail.google.com/mail/?view=cm&fs=1&to=moradamyre%40gmail.com",
    );
    await expect(sign).toHaveAttribute("target", "_blank");
    await expect(sign).toHaveAttribute("rel", "noopener noreferrer");
    await expect(sign).toContainText("moradamyre@gmail.com");
    await expect(page.getByRole("button", { name: /contact me/i })).toHaveCount(0);
  });

  test("Download CV is present but disabled while no CV exists", async ({ page }) => {
    await open(page, 1440, 900);
    const cv = page.locator(ACTIONS).getByRole("button", { name: "Download CV", includeHidden: true });
    await expect(cv).toBeVisible();
    await expect(cv).toBeDisabled();
    await expect(cv).toHaveAttribute("aria-disabled", "true");
  });

  test("the neon sign is polished: still 42px tall, no screws, no motion, no glow on its text, at most a two-layer glow", async ({ page }) => {
    // The "AI look" tells that were removed: fake mounting screws (::before/::after), a nudging arrow, a 9s flicker,
    // a five-layer glow stack, a glowing text-shadow on the address, and glowing mono for everything. Height stays
    // 42px so the hologram stage stays 630px (its canvas size feeds fitCamera).
    await open(page, 1440, 900);
    const sign = page.locator(SIGN);
    expect(Math.round((await sign.boundingBox())!.height)).toBe(42);
    const info = await sign.evaluate((el) => {
      const cs = (node: Element, pseudo?: string) => getComputedStyle(node, pseudo);
      const email = el.querySelector(".connect-sign__email")!;
      const label = el.querySelector(".connect-sign__label")!;
      return {
        before: cs(el, "::before").content,
        after: cs(el, "::after").content,
        animations: [el, email, label].map((node) => cs(node).animationName),
        emailShadow: cs(email).textShadow,
        labelShadow: cs(label).textShadow,
        emailFont: cs(email).fontFamily,
        glowLayers: cs(el).boxShadow.split(/\)\s*,\s*/).length,
        arrows: el.querySelectorAll(".connect-sign__arrow").length,
      };
    });
    expect(info.before).toBe("none");
    expect(info.after).toBe("none");
    // The sign's ROOT carries the shared card entrance (`bento-card-enter`, applied to every column child), which
    // is not an ornament. The label and the address, where the arrow and the flicker used to live, must not animate.
    expect(["none", "bento-card-enter"]).toContain(info.animations[0]);
    expect(info.animations.slice(1)).toEqual(["none", "none"]);
    expect(info.emailShadow).toBe("none");
    expect(info.labelShadow).toBe("none");
    expect(info.emailFont).toMatch(/Sora/);
    expect(info.glowLayers).toBeLessThanOrEqual(2);
    expect(info.arrows).toBe(0);
  });

  test("the sign is legible: text is not dimmed by its glow", async ({ page }) => {
    await open(page, 1440, 900);
    const email = page.locator(`${SIGN} .connect-sign__email`);
    await expect(email).toBeVisible();
    // Toned-down bloom (owner request): at most three shadow layers.
    const shadow = await email.evaluate((el) => getComputedStyle(el).textShadow);
    const layers = shadow.split(/\)\s*,\s*/).length;
    expect(layers).toBeLessThanOrEqual(3);
  });
});
