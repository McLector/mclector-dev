import { test, expect, type Page } from "@playwright/test";

/**
 * A first-time visitor sees the NIGHT theme, whatever their OS is set to. Only an explicit choice
 * (the day/night toggle, persisted to localStorage) changes that.
 *
 * Playwright's own default is a LIGHT OS, so every spec that doesn't pin a theme used to run the
 * light theme — these tests emulate both OS settings on purpose instead of relying on that.
 */
const html = (page: Page) => page.locator("html");

test.describe("default theme", () => {
  for (const os of ["light", "dark"] as const) {
    test.describe(`a first-time visitor whose OS is set to ${os}`, () => {
      test.use({ colorScheme: os });

      test("sees the dark theme", async ({ page }) => {
        await page.goto("/");
        await expect(html(page)).toHaveAttribute("data-theme", "dark");
      });
    });
  }

  test.describe("a visitor whose OS is set to light", () => {
    test.use({ colorScheme: "light" });

    test("gets dark from the anti-flash script alone, before the app has run", async ({ page }) => {
      // The inline script in index.html sets the theme before first paint (no wrong-sky flash) and must
      // agree with src/lib/theme.ts. Block every script request so React never runs: what is left is
      // the inline script's verdict, on its own.
      await page.route("**/*.js", (route) => route.abort());
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-theme", "dark");
      expect(await html(page).evaluate((el) => el.style.colorScheme)).toBe("dark");
    });

    test("is not flipped when the OS changes scheme while they have made no choice", async ({ page }) => {
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-theme", "dark");
      // The hook used to follow the OS until an explicit choice was made; it must not any more.
      await page.emulateMedia({ colorScheme: "dark" });
      await page.emulateMedia({ colorScheme: "light" });
      await page.waitForTimeout(300);
      await expect(html(page)).toHaveAttribute("data-theme", "dark");
    });

    test("still honours an explicit stored choice of light", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("mclector-theme", "light"));
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-theme", "light");
    });

    test("remembers a toggle to light across a reload", async ({ page }) => {
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-theme", "dark");
      await page.getByTestId("theme-toggle").click();
      await expect(html(page)).toHaveAttribute("data-theme", "light");
      expect(await page.evaluate(() => localStorage.getItem("mclector-theme"))).toBe("light");

      await page.reload();
      await expect(html(page)).toHaveAttribute("data-theme", "light");
    });
  });

  test.describe("a visitor whose OS is set to dark", () => {
    test.use({ colorScheme: "dark" });

    test("still honours an explicit stored choice of light", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("mclector-theme", "light"));
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-theme", "light");
    });
  });
});
