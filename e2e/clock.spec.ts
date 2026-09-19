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

  test("renders no broken image for the map placeholder", async ({ page }) => {
    await page.goto("/");

    const card = page.locator('[data-bento-area="place"]');
    await expect(card.locator("img")).toHaveCount(0);
    await expect(card.getByTestId("map-placeholder")).toBeAttached();
  });
});
