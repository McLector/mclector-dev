import { expect, type Page } from "@playwright/test";

/** Shared selectors and assertions for the hover specs. Not a spec: Playwright only runs `*.spec.ts`. */
export const NO_STORAGE = { cookies: [], origins: [] };

export const HEX = '[data-bento-area="social"] a.hexgrid__link';
export const SKILL = '[data-bento-area="skills"] li';
export const SIGN = '[data-bento-area="connect"]';
export const PROJECT_ROW = '[data-bento-area="work"] button';

export async function open(page: Page) {
  await page.setViewportSize(page.viewportSize() ?? { width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(HEX).first().waitFor();
}

export const style = (page: Page, selector: string, prop: string, nth = 0) =>
  page.locator(selector).nth(nth).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

/** "0.15s, 0.15s" -> every part is a real, non-zero duration. */
export const allNonZero = (durations: string) => durations.split(",").every((d) => parseFloat(d) > 0);
/** The longest single duration in a list like "5.5s, 140s" (or "1e-06s" when frozen). */
export const longest = (durations: string) => Math.max(...durations.split(",").map((d) => parseFloat(d)));

/**
 * Hover works for the hexagons, the skill tiles and the sign, and every one of them keeps a real, non-zero
 * transition: not merely "the hover state applies" (a snap also passes that), but that it animates.
 */
export async function expectHoverWorks(page: Page) {
  // 1. Hexagon: the icon lifts, the name appears, the whole cell lifts.
  const hex = page.locator(HEX).first();
  await hex.hover();
  await expect.poll(() => style(page, HEX, "transform")).toBe("matrix(1, 0, 0, 1, 0, -2)");
  await expect(hex.locator(".hexgrid__label")).toHaveCSS("opacity", "1");
  expect(allNonZero(await style(page, HEX, "transition-duration"))).toBe(true);
  expect(allNonZero(await style(page, `${HEX} .hexgrid__icon`, "transition-duration"))).toBe(true);
  expect(allNonZero(await style(page, `${HEX} .hexgrid__label`, "transition-duration"))).toBe(true);

  // 2. Skill tile: lifts 2px (Tailwind's `translate` property).
  await page.mouse.move(2, 2);
  await page.locator(SKILL).first().hover();
  await expect.poll(() => style(page, SKILL, "translate")).toMatch(/-2px/);
  expect(allNonZero(await style(page, SKILL, "transition-duration"))).toBe(true);

  // 3. The sign lifts 1px.
  await page.mouse.move(2, 2);
  await page.locator(SIGN).hover();
  await expect.poll(() => style(page, SIGN, "translate")).toMatch(/-1px/);
  expect(allNonZero(await style(page, SIGN, "transition-duration"))).toBe(true);
}
