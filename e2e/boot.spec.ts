import { test, expect } from "@playwright/test";
import { THEME_COLOR } from "../src/lib/theme";

/**
 * The inline boot script in index.html sets `data-motion` and `data-input` on <html> BEFORE first paint, so the
 * CSS never flashes the wrong state. It is a hand-synced copy of src/lib/motion.ts (resolveInitialMotion) and
 * src/lib/inputMode.ts (initialInputMode), so it is tested alone: every script request is blocked so React never
 * runs, and what is left is the inline script's own verdict. (Same technique as theme.spec.ts.)
 */
const NO_STORAGE = { cookies: [], origins: [] };
const html = (page: import("@playwright/test").Page) => page.locator("html");

async function blockScripts(page: import("@playwright/test").Page) {
  await page.route("**/*.js", (route) => route.abort());
}

test.describe("boot script — animations", () => {
  test.describe("a first-time visitor", () => {
    test.use({ storageState: NO_STORAGE });

    test("gets animations ON", async ({ page }) => {
      await blockScripts(page);
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-motion", "on");
    });

    test("gets animations ON even when their OS asks for reduced motion (the OS setting is not an input)", async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: "reduce", storageState: NO_STORAGE });
      const page = await context.newPage();
      await blockScripts(page);
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-motion", "on");
      await context.close();
    });

    test("keeps an explicit stored 'off'", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("mclector-motion", "off"));
      await blockScripts(page);
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-motion", "off");
    });

    test("ignores a garbage stored value and stays ON, so a corrupt entry cannot silently freeze the site", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("mclector-motion", "banana"));
      await blockScripts(page);
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-motion", "on");
    });
  });
});

test.describe("boot script — input mode", () => {
  test("seeds a first-paint hint from any-hover: mouse on a desktop, touch on a phone", async ({ page }) => {
    await blockScripts(page);
    await page.goto("/");
    const expected = test.info().project.name === "chromium" ? "mouse" : "touch";
    await expect(html(page)).toHaveAttribute("data-input", expected);
  });

  test("the app agrees with the boot script once React has run", async ({ page }) => {
    await page.goto("/");
    const expected = test.info().project.name === "chromium" ? "mouse" : "touch";
    await expect(html(page)).toHaveAttribute("data-input", expected);
  });
});

/**
 * The browser chrome colour (`theme-color`) must be right on FIRST paint, not after React boots: otherwise a returning
 * visitor with the light theme stored sees a dark status bar on a phone until the bundle runs, then a visible flip.
 * Every script request is blocked, so what is asserted is the inline boot script's own doing. The values are the
 * expected values are read from THEME_COLOR in src/lib/theme.ts, so the inline script in index.html (a hand-synced
 * copy) cannot drift from it.
 */
test.describe("boot script — theme-color", () => {
  const themeColor = (page: import("@playwright/test").Page) => page.locator('meta[name="theme-color"]');

  test("advertises the light chrome colour before React runs when the light theme is stored", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("mclector-theme", "light"));
    await blockScripts(page);
    await page.goto("/");
    await expect(themeColor(page)).toHaveAttribute("content", THEME_COLOR.light);
  });

  test("advertises the dark chrome colour for a stored dark choice", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("mclector-theme", "dark"));
    await blockScripts(page);
    await page.goto("/");
    await expect(themeColor(page)).toHaveAttribute("content", THEME_COLOR.dark);
  });

  test.describe("a first-time visitor", () => {
    test.use({ storageState: NO_STORAGE });

    test("gets the dark chrome colour, because dark is the default", async ({ page }) => {
      await blockScripts(page);
      await page.goto("/");
      await expect(themeColor(page)).toHaveAttribute("content", THEME_COLOR.dark);
    });
  });

  test("ignores a garbage stored value and falls back to the dark chrome colour", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("mclector-theme", "banana"));
    await blockScripts(page);
    await page.goto("/");
    await expect(themeColor(page)).toHaveAttribute("content", THEME_COLOR.dark);
  });
});
