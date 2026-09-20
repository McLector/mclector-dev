import { test, expect } from "@playwright/test";

test.describe("location card clock", () => {
  test("shows the city and a live HH:MM:SS local time", async ({ page }) => {
    await page.goto("/");

    const card = page.locator('[data-bento-area="place"]');
    await expect(card).toHaveCount(1);
    await expect(card.getByText("Batangas, Philippines")).toBeVisible();
    await expect(card.getByText("GMT+8 · Manila")).toBeVisible();

    const clock = card.getByTestId("local-clock");
    await expect(clock).toBeVisible();
    await expect(clock).toHaveText(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
  });

  /**
   * The only automated guard for the centring: visual.spec.ts masks this card (its clock ticks).
   * Measures the VISIBLE content of each row — the dot + name, the clock digits, and the eyebrow's
   * dot + text minus its trailing letter-space — not their boxes, which include empty space.
   * Runs on both the desktop and mobile projects: centring does not depend on the viewport.
   */
  test("every row is centred on the card's vertical centre line", async ({ page }) => {
    await page.goto("/");
    // The entrance animation offsets rects by 14px while it plays.
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });

    const card = page.locator('[data-bento-area="place"]');
    await expect(card).toBeVisible();

    const offsets = await card.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const textRect = (node: Element) => {
        const text = [...node.childNodes].find((n) => n.nodeType === 3 && n.textContent?.trim());
        const range = document.createRange();
        range.selectNodeContents(text!);
        return range.getBoundingClientRect();
      };
      const dot = el.querySelector('[data-testid="location-status-dot"]')!;
      const city = textRect(dot.parentElement!.querySelector("p")!);
      const clock = textRect(el.querySelector('[data-testid="local-clock"]')!);
      const eyebrow = [...el.querySelectorAll("p")].find((p) => p.textContent?.includes("GMT+8"))!;
      const eyebrowText = textRect(eyebrow);
      const trailing = parseFloat(getComputedStyle(eyebrow).fontSize) * 0.2; // .eyebrow letter-spacing
      const mid = (a: number, b: number) => (a + b) / 2 - cx;
      return {
        "city (dot + name)": mid(dot.getBoundingClientRect().left, city.right),
        clock: mid(clock.left, clock.right),
        "eyebrow (dot + text)": mid(eyebrow.getBoundingClientRect().left, eyebrowText.right - trailing),
      };
    });

    for (const [row, offset] of Object.entries(offsets)) {
      expect(Math.abs(offset), `${row} is ${offset.toFixed(2)}px off the card's centre line`).toBeLessThan(1);
    }
  });

  test("renders no broken image for the map placeholder", async ({ page }) => {
    await page.goto("/");

    const card = page.locator('[data-bento-area="place"]');
    await expect(card.locator("img")).toHaveCount(0);
    await expect(card.getByTestId("map-placeholder")).toBeAttached();
  });
});
