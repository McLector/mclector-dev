import { test, expect } from "@playwright/test";

/**
 * Tab identity — the title and favicon a visitor sees in the browser tab.
 *
 * These run against the built preview (see playwright.config.ts), so the favicon fetch proves
 * Vite copied public/favicon.svg into dist/, not merely that a dev server can see it.
 */
test.describe("tab branding", () => {
  test("the tab is titled exactly 'McLector Dev'", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("McLector Dev");
  });

  test("the page declares /favicon.svg as an SVG icon", async ({ page }) => {
    await page.goto("/");
    const icon = page.locator('head link[rel="icon"]');
    await expect(icon).toHaveCount(1);
    await expect(icon).toHaveAttribute("type", "image/svg+xml");
    await expect(icon).toHaveAttribute("href", "/favicon.svg");
  });

  test("/favicon.svg is served as an SVG", async ({ request }) => {
    // vercel.json sends X-Content-Type-Options: nosniff, so a wrong MIME type would make the
    // browser refuse the icon outright rather than sniff it.
    const res = await request.get("/favicon.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
  });

  test.describe("the icon artwork", () => {
    const load = async (request: import("@playwright/test").APIRequestContext) =>
      (await request.get("/favicon.svg")).text();

    test("is a viewBox 0 0 32 32 square", async ({ request }) => {
      expect(await load(request)).toMatch(/viewBox="0 0 32 32"/);
    });

    test("sits on a full-bleed black background", async ({ request }) => {
      const svg = await load(request);
      const bg = svg.match(/<rect\b[^>]*>/);
      expect(bg, "expected a <rect> for the background").not.toBeNull();
      expect(bg![0]).toMatch(/width="32"/);
      expect(bg![0]).toMatch(/height="32"/);
      expect(bg![0]).toMatch(/fill="#000(000)?"/i);
      // Full-bleed means square corners: a rounded tile would leave a lighter halo in the tab.
      expect(bg![0]).not.toMatch(/\brx=/);
    });

    test("draws the letters in the arc cyan", async ({ request }) => {
      expect(await load(request)).toMatch(/stroke="#5ec8ff"/i);
    });

    test("draws exactly three letter paths, M, C and L", async ({ request }) => {
      const paths = (await load(request)).match(/<path\b/g) ?? [];
      expect(paths).toHaveLength(3);
    });

    test("uses geometry, not text — favicons cannot rely on a webfont", async ({ request }) => {
      const svg = await load(request);
      expect(svg).not.toMatch(/<text\b/i);
      expect(svg).not.toMatch(/font-family/i);
    });

    test("stays flat — no gradient, which muddies at 16px", async ({ request }) => {
      expect(await load(request)).not.toMatch(/Gradient/i);
    });
  });
});
