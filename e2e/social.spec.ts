import { test, expect, type Page } from "@playwright/test";

const SOCIAL = '[data-bento-area="social"]';
const HEX_LINK = `${SOCIAL} a.hexgrid__link`;

/** Tab until focus lands inside the social honeycomb; returns how many it took. */
async function tabIntoSocialGrid(page: Page, maxTabs = 40): Promise<number> {
  for (let i = 1; i <= maxTabs; i += 1) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(
      (selector) => !!document.activeElement?.closest(selector),
      SOCIAL,
    );
    if (inside) return i;
  }
  throw new Error(`Social grid was not reachable within ${maxTabs} Tab presses`);
}

test.describe("social honeycomb", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(HEX_LINK).first()).toBeVisible();
  });

  test("every hex has an accessible name that does not depend on hover", async ({ page }) => {
    const links = page.locator(HEX_LINK);
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const name = await links.nth(i).getAttribute("aria-label");
      expect(name?.trim()).toBeTruthy();
    }
  });

  test("a hex is keyboard reachable and its focus ring is NOT clipped away", async ({ page }) => {
    await tabIntoSocialGrid(page);

    const focused = page.locator(`${HEX_LINK}:focus`);
    await expect(focused).toHaveCount(1);

    const cell = page.locator(`${SOCIAL} .hexgrid__cell:has(a:focus)`);
    const ring = cell.locator("[data-hex-focus-ring]");
    await expect(ring).toHaveCount(1);

    // 1. The ring is a SIBLING of the clipped anchor, not a descendant — a
    //    descendant (or the anchor's own outline) would be eaten by clip-path.
    const ringIsOutsideAnchor = await cell.evaluate((node) => {
      const anchor = node.querySelector("a");
      const focusRing = node.querySelector("[data-hex-focus-ring]");
      return !!anchor && !!focusRing && !anchor.contains(focusRing);
    });
    expect(ringIsOutsideAnchor).toBe(true);

    // 2. It is actually painted while focused.
    await expect(ring).toHaveCSS("opacity", "1");

    // 3. And it extends beyond the hex it rings, so it is visible rather than
    //    hidden underneath the cell.
    const ringBox = await ring.boundingBox();
    const linkBox = await cell.locator("a").boundingBox();
    expect(ringBox).not.toBeNull();
    expect(linkBox).not.toBeNull();
    expect(ringBox!.width).toBeGreaterThan(linkBox!.width);
    expect(ringBox!.height).toBeGreaterThan(linkBox!.height);
  });

  test("the ring is hidden when nothing in the grid is focused", async ({ page }) => {
    const ring = page.locator(`${SOCIAL} [data-hex-focus-ring]`).first();
    await expect(ring).toHaveCSS("opacity", "0");
  });

  test("arrow keys move focus between hexes and keep one tab stop", async ({ page }) => {
    await tabIntoSocialGrid(page);

    const first = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    );
    await page.keyboard.press("End");
    const last = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    );
    expect(last).not.toBe(first);

    await page.keyboard.press("Home");
    const home = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    );
    expect(home).toBe(first);

    const tabStops = await page.locator(`${HEX_LINK}[tabindex="0"]`).count();
    expect(tabStops).toBe(1);
  });

  test("the section is titled Contact & Socials", async ({ page }) => {
    await expect(page.locator(SOCIAL).getByRole("heading", { name: "Contact & Socials" })).toBeVisible();
    await expect(page.locator(SOCIAL)).not.toContainText("Elsewhere");
  });

  test("every hex icon sits dead-centre at rest (the label no longer takes layout space)", async ({ page }) => {
    // Hovering is desktop-only; on touch the icon is deliberately lifted for the label.
    test.skip(test.info().project.name !== "chromium", "rest state differs on touch");
    const offsets = await page.locator(HEX_LINK).evaluateAll((links) =>
      links.map((a) => {
        const hb = a.getBoundingClientRect();
        const ib = a.querySelector(".hexgrid__icon")!.getBoundingClientRect();
        return [ib.x + ib.width / 2 - (hb.x + hb.width / 2), ib.y + ib.height / 2 - (hb.y + hb.height / 2)];
      }),
    );
    expect(offsets).toHaveLength(7);
    for (const [dx, dy] of offsets) {
      expect(Math.abs(dx)).toBeLessThan(0.75);
      expect(Math.abs(dy)).toBeLessThan(0.75);
    }
  });

  test("hovering Instagram lifts the icon and shows the WHOLE label — no ellipsis", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium", "hover is desktop-only");
    const link = page.locator(`${HEX_LINK}[aria-label="Instagram"]`);
    const icon = link.locator(".hexgrid__icon");
    const label = link.locator(".hexgrid__label");

    const restY = (await icon.boundingBox())!.y;
    await link.hover();
    await expect(label).toHaveCSS("opacity", "1");
    await expect.poll(async () => restY - (await icon.boundingBox())!.y).toBeGreaterThan(5);

    // The label BOX is always full-width, so measure the TEXT itself.
    const m = await label.evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return {
        text: range.getBoundingClientRect().width,
        hex: node.closest("a")!.getBoundingClientRect().width,
        overflow: getComputedStyle(node).textOverflow,
        content: node.textContent,
      };
    });
    expect(m.content).toBe("Instagram");
    expect(m.overflow).not.toBe("ellipsis");
    expect(m.text).toBeLessThanOrEqual(m.hex * 0.92);
  });

  test("the label is revealed by keyboard focus, not only by hover", async ({ page }) => {
    const label = page.locator(`${HEX_LINK} .hexgrid__label`).first();

    // On fine-pointer (desktop) devices the label is hidden until hover/focus;
    // on touch devices (no hover) it is always visible so navigation is never
    // mystery-meat. Either way, keyboard focus must show it.
    const isTouch = test.info().project.name !== "chromium";
    await expect(label).toHaveCSS("opacity", isTouch ? "1" : "0");

    await tabIntoSocialGrid(page);
    const focusedLabel = page.locator(`${HEX_LINK}:focus .hexgrid__label`);
    await expect(focusedLabel).toHaveCSS("opacity", "1");
  });
});
