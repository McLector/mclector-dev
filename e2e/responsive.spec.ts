import { test, expect } from "@playwright/test";

/**
 * The responsive contract from src/layout/bento.css:
 *  - below 700px the bento is a single stacked column;
 *  - at 1024px and up it is a three-column grid.
 * The layout is FLUID at every size: rows are content-sized and the page
 * scrolls naturally when the content is taller than the viewport. There is no
 * desktop "one-screen, overflow:hidden" lock any more — that lock is what used
 * to force visitors to zoom out.
 *
 * Only run on the desktop chromium project: the mobile-chrome project
 * emulates a fixed device (touch, DPR, its own viewport), which makes
 * "resize to 1440 and assert the desktop layout" meaningless there.
 */
test.skip(
  () => test.info().project.name !== "chromium",
  "viewport-driven layout assertions run on the desktop project only",
);

const intro = '[data-bento-area="intro"]';
const pass = '[data-bento-area="pass"]';

async function boxes(page: import("@playwright/test").Page) {
  const a = await page.locator(intro).boundingBox();
  const b = await page.locator(pass).boundingBox();
  expect(a, "intro card has no box").not.toBeNull();
  expect(b, "pass card has no box").not.toBeNull();
  return { a: a!, b: b! };
}

async function bentoOverflowY(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const grid = document.querySelector(".bento");
    return grid ? getComputedStyle(grid).overflowY : "";
  });
}

async function pageScrolls(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    // 2px of slack for sub-pixel layout rounding.
    return doc.scrollHeight > window.innerHeight + 2;
  });
}

test.describe("responsive layout", () => {
  test("stacks into a single column at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator(intro).waitFor();

    const columns = await page.evaluate(() => {
      const grid = document.querySelector(".bento");
      return grid ? getComputedStyle(grid).gridTemplateColumns : "";
    });
    // A single-column grid resolves to exactly one track.
    expect(columns.trim().split(/\s+/)).toHaveLength(1);

    const { a, b } = await boxes(page);
    // Stacked vertically: one starts below the other, with no horizontal offset.
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height - 2);
    expect(Math.abs(b.x - a.x)).toBeLessThan(2);
  });

  test("places intro and pass side by side at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.locator(intro).waitFor();

    const columns = await page.evaluate(() => {
      const grid = document.querySelector(".bento");
      return grid ? getComputedStyle(grid).gridTemplateColumns : "";
    });
    expect(columns.trim().split(/\s+/)).toHaveLength(3);

    const { a, b } = await boxes(page);
    // Side by side: pass starts to the right of intro and their vertical
    // extents overlap.
    expect(b.x).toBeGreaterThanOrEqual(a.x + a.width - 2);
    expect(a.y).toBeLessThan(b.y + b.height);
    expect(b.y).toBeLessThan(a.y + a.height);
  });

  test("scrolls at 390px (mobile scroll is documented behaviour)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator(intro).waitFor();

    // No overflow lock on mobile.
    expect(await bentoOverflowY(page)).not.toBe("hidden");

    // While the cards are still Phase-0 placeholders the real content can be
    // shorter than the viewport, so "it scrolls" is proved by making the page
    // taller with a test-only spacer: if scrolling were locked, this would
    // still report no scroll.
    await page.addStyleTag({
      content: 'body::after { content: ""; display: block; height: 1500px; }',
    });
    expect(await pageScrolls(page)).toBe(true);
  });

  test("is fluid at 1440px: no overflow lock, scrolls when content is tall", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/");
    await page.locator(intro).waitFor();

    // The desktop grid no longer traps content in one screen.
    expect(await bentoOverflowY(page)).not.toBe("hidden");

    // A tall page scrolls rather than clipping (proven with a test-only spacer,
    // so the assertion holds regardless of how tall the real content is).
    await page.addStyleTag({
      content: 'body::after { content: ""; display: block; height: 1500px; }',
    });
    expect(await pageScrolls(page)).toBe(true);
  });
});
