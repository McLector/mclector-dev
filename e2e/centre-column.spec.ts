import { test, expect, type Page } from "@playwright/test";

/**
 * The centre column is sign → stage → Download CV, all on ONE vertical axis
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

  test("stacks sign above the stage above Download CV", async ({ page }) => {
    await open(page, 1440, 900);
    const sign = (await page.locator(SIGN).boundingBox())!;
    const stage = (await page.locator(STAGE).boundingBox())!;
    const cv = (await page.locator(ACTIONS).boundingBox())!;
    expect(sign.y + sign.height).toBeLessThanOrEqual(stage.y + 1);
    expect(stage.y + stage.height).toBeLessThanOrEqual(cv.y + 1);
  });

  test("the sign is a mailto link and there is no Contact me button", async ({ page }) => {
    await open(page, 1440, 900);
    const sign = page.locator(SIGN);
    await expect(sign).toBeVisible();
    await expect(sign).toHaveAttribute("href", /^mailto:.+@.+/);
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
