import { test, expect } from "@playwright/test";
import { HEX, expectHoverWorks, open } from "./support/hover";

/**
 * THE OWNER'S LAPTOP, reproduced. A browser that claims there is NO hover and no fine pointer even though a real
 * mouse is attached. Chromium is told that the primary AND every available input is a coarse pointer that cannot
 * hover, which is exactly what made `(hover: hover) and (pointer: fine)` false there: every hover effect died and
 * the social hexagons showed every name permanently.
 *
 * `launchOptions` can only be set at the top level of a spec file (it forces a new worker), hence this file.
 * The flag values are Chromium's blink-settings enums: HoverType none=1 / hover=2, PointerType none=1 / coarse=2 /
 * fine=4. The first test asserts the browser really reports "no hover", so a wrong flag fails loudly instead of
 * quietly testing nothing.
 */
test.use({
  launchOptions: {
    args: [
      "--disable-3d-apis",
      "--blink-settings=primaryHoverType=1,availableHoverTypes=1,primaryPointerType=2,availablePointerTypes=2",
    ],
  },
});
test.beforeEach(() => test.skip(test.info().project.name !== "chromium", "desktop project only"));

test("the browser really does report no hover", async ({ page }) => {
  await open(page);
  const media = await page.evaluate(() => ({
    hover: matchMedia("(hover: hover)").matches,
    anyHover: matchMedia("(any-hover: hover)").matches,
    fine: matchMedia("(pointer: fine)").matches,
  }));
  expect(media).toEqual({ hover: false, anyHover: false, fine: false });
});

test("starts safe: no mouse seen yet, so every name is visible and nothing depends on hover", async ({ page }) => {
  await open(page);
  await expect(page.locator("html")).toHaveAttribute("data-input", "touch");
  const labels = page.locator(`${HEX} .hexgrid__label`);
  await expect(labels).toHaveCount(7);
  for (let i = 0; i < 7; i += 1) await expect(labels.nth(i)).toHaveCSS("opacity", "1");
});

test("the first real mouse move turns hover on: names tuck away, and hover animates", async ({ page }) => {
  await open(page);
  await expect(page.locator("html")).toHaveAttribute("data-input", "touch");

  await page.mouse.move(6, 6);
  await expect(page.locator("html")).toHaveAttribute("data-input", "mouse");

  // At rest the names are hidden again (mouse mode)...
  const labels = page.locator(`${HEX} .hexgrid__label`);
  for (let i = 0; i < 7; i += 1) await expect(labels.nth(i)).toHaveCSS("opacity", "0");
  // ...and hover works exactly as on any desktop: hexagons, skill tiles and the sign all animate.
  await expectHoverWorks(page);
});
