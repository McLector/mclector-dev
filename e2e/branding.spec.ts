import { test, expect } from "@playwright/test";

/**
 * Tab identity — the title and favicon a visitor sees in the browser tab.
 *
 * The mark is the owner's M inside the arc reactor inside a hexagon (round 3b, "L1 hex tile", full cut).
 * These run against the built preview (see playwright.config.ts), so the favicon fetch proves Vite copied
 * public/favicon.svg into dist/, not merely that a dev server can see it.
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
    const paths = (svg: string) => [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
    const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

    // SVG 1.1 F.6.5: recover an arc's centre from its endpoints and flags. If it is not where the artwork intends,
    // the path draws somewhere unintended: a plausible-looking arc landed 4.45 units on top of a neighbouring letter
    // in session 008, and only arithmetic caught it.
    function arcCentre(d: string) {
      const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number); // M x1 y1 A rx ry rot large sweep x2 y2
      const [x1, y1, r, , , large, sweep, x2, y2] = n;
      const dx = (x1 - x2) / 2;
      const dy = (y1 - y2) / 2;
      let k = Math.sqrt(Math.max(0, (r ** 4 - r * r * dy * dy - r * r * dx * dx) / (r * r * dy * dy + r * r * dx * dx)));
      if (large === sweep) k = -k;
      return [k * dy + (x1 + x2) / 2, -k * dx + (y1 + y2) / 2];
    }

    test("is a viewBox 0 0 32 32 square", async ({ request }) => {
      expect(await load(request)).toMatch(/viewBox="0 0 32 32"/);
    });

    test("is a hexagon with transparent corners, not a full-bleed square tile", async ({ request }) => {
      const svg = await load(request);
      // A square <rect> background would fill the corners; the hexagon silhouette is what gives the mark its own
      // shape on a dark tab strip, where a dark square tile barely separates (1.15 to 1.3:1).
      expect(svg).not.toMatch(/<rect\b/i);
      const hex = paths(svg)[0];
      expect(attr(hex, "fill")?.toLowerCase()).toBe("#07122e");
      // Pointy-top hexagon: M + 5 L + Z, six vertices, every one inside the viewBox with a margin.
      expect(hex.match(/\bL\b/g)).toHaveLength(5);
      expect(attr(hex, "d")).toMatch(/Z\s*$/);
      const coords = attr(hex, "d")!.match(/-?\d+(\.\d+)?/g)!.map(Number);
      for (const c of coords) {
        expect(c).toBeGreaterThanOrEqual(0.5);
        expect(c).toBeLessThanOrEqual(31.5);
      }
    });

    test("draws exactly three paths: the hexagon, the reactor ring and the M", async ({ request }) => {
      expect(paths(await load(request))).toHaveLength(3);
    });

    test("the reactor ring is centred exactly on (16, 16), computed from the path, not eyeballed", async ({ request }) => {
      const ring = paths(await load(request)).find((p) => /\sd="[^"]*\bA\b/.test(p));
      expect(ring, "expected an arc path for the reactor ring").toBeTruthy();
      const [cx, cy] = arcCentre(attr(ring!, "d")!);
      expect(cx).toBeCloseTo(16, 1);
      expect(cy).toBeCloseTo(16, 1);
    });

    test("uses only the navy tile and the arc cyan", async ({ request }) => {
      const svg = await load(request);
      const colours = [...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1].toLowerCase());
      expect(colours.length).toBeGreaterThan(0);
      for (const c of colours) expect(["#07122e", "#5ec8ff", "none"]).toContain(c);
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
