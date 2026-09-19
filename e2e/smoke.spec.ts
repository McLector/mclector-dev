import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("loads without console errors and renders every bento area", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("/");

    const areas = [
      "intro",
      "skills",
      "pass",
      "social",
      "place",
      "work",
      "certifications",
      "actions",
      "connect",
    ];
    for (const area of areas) {
      await expect(page.locator(`[data-bento-area="${area}"]`)).toHaveCount(1);
    }

    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });

  test("desktop viewport applies the bento grid layout", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const grid = page.locator(".bento");
    await expect(grid).toHaveCSS("display", "grid");
  });
});
