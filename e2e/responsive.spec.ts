import { test, expect, type Page } from "@playwright/test";

/**
 * The responsive contract of the framed window (src/layout/AppFrame.tsx,
 * src/layout/useFitScale.ts, src/layout/bento.css):
 *  - at 861px and up the portfolio is ONE fixed-design window (1200×770) scaled
 *    as a unit to fit the viewport: it fits with NO page scroll, and its
 *    interior is a three-column grid (identity rail / hologram stage / feed);
 *  - at 860px and below the scale is dropped and the cards reflow into a single
 *    natural, scrolling column.
 *
 * (This replaces the earlier "fluid, scrolls at any size" contract — the frame
 * is what removed the need to zoom the browser out.)
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
const AREAS = [
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

async function boxes(page: Page) {
  const a = await page.locator(intro).boundingBox();
  const b = await page.locator(pass).boundingBox();
  expect(a, "intro card has no box").not.toBeNull();
  expect(b, "pass card has no box").not.toBeNull();
  return { a: a!, b: b! };
}

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await page.locator(intro).waitFor();
}

/** True when the document itself would scroll (2px slack for sub-pixel rounding). */
async function pageScrolls(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollHeight > window.innerHeight + 2 || doc.scrollWidth > window.innerWidth + 2;
  });
}

test.describe("desktop: a scaled, no-scroll window", () => {
  for (const [width, height] of [
    [1440, 900],
    [1440, 800],
    [1366, 640],
    [1024, 600],
  ] as const) {
    test(`fits ${width}x${height} with no page scroll`, async ({ page }) => {
      await open(page, width, height);

      expect(await pageScrolls(page), "document scrolls on desktop").toBe(false);

      // The scaled window sits fully inside the viewport (bounding boxes are
      // post-transform, i.e. real on-screen pixels).
      const win = await page.locator(".app-window").boundingBox();
      expect(win, "window has no box").not.toBeNull();
      expect(win!.x).toBeGreaterThanOrEqual(-1);
      expect(win!.y).toBeGreaterThanOrEqual(-1);
      expect(win!.x + win!.width).toBeLessThanOrEqual(width + 1);
      expect(win!.y + win!.height).toBeLessThanOrEqual(height + 1);
    });
  }

  test("keeps every card inside the window at the smallest desktop", async ({ page }) => {
    await open(page, 1024, 600);
    const win = (await page.locator(".app-window").boundingBox())!;
    for (const area of AREAS) {
      const box = await page.locator(`[data-bento-area="${area}"]`).boundingBox();
      expect(box, `${area} has no box`).not.toBeNull();
      expect(box!.x, `${area} left edge`).toBeGreaterThanOrEqual(win.x - 1);
      expect(box!.y, `${area} top edge`).toBeGreaterThanOrEqual(win.y - 1);
      expect(box!.x + box!.width, `${area} right edge`).toBeLessThanOrEqual(win.x + win.width + 1);
      expect(box!.y + box!.height, `${area} bottom edge`).toBeLessThanOrEqual(win.y + win.height + 1);
    }
  });

  test("scales the window down to fit a short viewport, never up past 1", async ({ page }) => {
    await open(page, 1440, 640);
    const short = (await page.locator(".app-window").boundingBox())!;
    expect(short.height).toBeLessThan(770); // shrunk to fit

    await open(page, 2560, 1600);
    const big = (await page.locator(".app-window").boundingBox())!;
    expect(Math.round(big.width)).toBe(1200); // capped at design size
    expect(Math.round(big.height)).toBe(770);
  });

  test("lays the interior out as three columns, intro left of the hologram", async ({ page }) => {
    await open(page, 1440, 900);

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

  test("shows every skill row and all four projects without clipping", async ({ page }) => {
    await open(page, 1440, 900);

    // The skills list is internally scrollable as a safety net, but at the
    // design size the full 29-skill grid must not need it.
    const skillsOverflow = await page.evaluate(() => {
      const list = document.querySelector('[data-bento-area="skills"] .overflow-y-auto');
      return list ? list.scrollHeight - list.clientHeight : -1;
    });
    expect(skillsOverflow, "skills grid is clipped").toBeLessThanOrEqual(1);

    const projectsOverflow = await page.evaluate(() => {
      const list = document.querySelector('[data-testid="projects-list"]');
      return list ? list.scrollHeight - list.clientHeight : -1;
    });
    expect(projectsOverflow, "projects list is clipped").toBeLessThanOrEqual(1);
  });
});

test.describe("mobile: an unscaled, scrolling column", () => {
  test("stacks into a single column at 390px, intro above the hologram", async ({ page }) => {
    await open(page, 390, 844);

    // The mobile bento is a flex column (the column wrappers dissolve).
    const direction = await page.evaluate(() => {
      const grid = document.querySelector(".bento");
      return grid ? getComputedStyle(grid).flexDirection : "";
    });
    expect(direction).toBe("column");

    const { a, b } = await boxes(page);
    // Stacked vertically: one starts below the other, with no horizontal offset.
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height - 2);
    expect(Math.abs(b.x - a.x)).toBeLessThan(2);
  });

  test("drops the scale transform below the breakpoint", async ({ page }) => {
    await open(page, 390, 844);
    const transform = await page.evaluate(() => {
      const win = document.querySelector(".app-window");
      return win ? getComputedStyle(win).transform : "";
    });
    expect(transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);
  });

  test("scrolls at 390px (mobile scroll is documented behaviour)", async ({ page }) => {
    await open(page, 390, 844);
    // The stacked cards are far taller than one phone screen, so the document
    // genuinely scrolls — no test-only spacer needed now that the content is real.
    expect(await pageScrolls(page)).toBe(true);
  });

  test("switches layout at the 860/861px breakpoint", async ({ page }) => {
    await open(page, 860, 900);
    const mobile = await page.evaluate(
      () => getComputedStyle(document.querySelector(".bento")!).flexDirection,
    );
    expect(mobile).toBe("column");

    await open(page, 861, 900);
    const desktopColumns = await page.evaluate(
      () => getComputedStyle(document.querySelector(".bento")!).gridTemplateColumns,
    );
    expect(desktopColumns.trim().split(/\s+/)).toHaveLength(3);
  });
});

/**
 * The day/night + Animations toggles (`.toggle-dock`, styles/index.css). On desktop they float top-right in the margin
 * around the scaled window. On a phone the window is full-width, so the same spot sat ON the intro card's corner and
 * headline: the reported bug. Under 860px the pair is a row pinned bottom-right instead.
 *
 * The contract is deliberately narrow, because a fixed control floats over SOMETHING mid-scroll and a test claiming
 * otherwise could never pass: at the top of the page the dock clears the intro, the sign and Download CV; at the
 * bottom the last card clears the dock. In between it is chrome over the hologram and the lists, which is intended.
 */
const THEME = '[data-testid="theme-toggle"]';
const MOTION = '[data-testid="motion-toggle"]';
const DOCK = ".toggle-dock";

type Box = { x: number; y: number; width: number; height: number };

const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function box(page: Page, selector: string): Promise<Box> {
  const b = await page.locator(selector).boundingBox();
  expect(b, `${selector} has no box`).not.toBeNull();
  return b!;
}

test.describe("toggle dock: desktop is exactly as approved", () => {
  test("stacks in a column, top-right, at 1.25rem from each edge, clear of the window (1440x900)", async ({ page }) => {
    await open(page, 1440, 900);

    expect(await page.locator(DOCK).evaluate((el) => getComputedStyle(el).flexDirection)).toBe("column");

    const theme = await box(page, THEME);
    const motion = await box(page, MOTION);
    // 40px discs (size-10) at top:20/right:20 with a 8px gap: the geometry the pair had before it was a class.
    expect(Math.round(theme.x + theme.width)).toBe(1440 - 20);
    expect(Math.round(theme.y)).toBe(20);
    expect(Math.round(motion.y)).toBe(20 + 40 + 8);
    expect(Math.round(motion.x)).toBe(Math.round(theme.x));

    const win = await box(page, ".app-window");
    expect(intersects(theme, win), "theme toggle overlaps the window").toBe(false);
    expect(intersects(motion, win), "motion toggle overlaps the window").toBe(false);
  });

  test("scales with the root font size (rem, not px), as the utilities it replaced did", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.style.fontSize = "20px";
      });
    });
    await page.goto("/");
    await page.locator(THEME).waitFor();
    const theme = await box(page, THEME);
    // 1.25rem at a 20px root: 25px, not the 20px a hard-coded value would give.
    expect(Math.round(theme.y)).toBe(25);
    expect(Math.round(1440 - (theme.x + theme.width))).toBe(25);
  });
});

test.describe("toggle dock: mobile", () => {
  test("sits in a row, bottom-right, in the lower half of the screen", async ({ page }) => {
    await open(page, 390, 844);

    expect(await page.locator(DOCK).evaluate((el) => getComputedStyle(el).flexDirection)).toBe("row");

    const theme = await box(page, THEME);
    const motion = await box(page, MOTION);
    // Side by side: same row, Animations to the right of day/night.
    expect(Math.abs(motion.y - theme.y)).toBeLessThan(1);
    expect(motion.x).toBeGreaterThan(theme.x + theme.width - 1);
    // Bottom-right: lower half, and inside the right edge.
    expect(theme.y).toBeGreaterThan(844 / 2);
    expect(motion.x + motion.width).toBeLessThanOrEqual(390);
    expect(motion.y + motion.height).toBeLessThanOrEqual(844);
  });

  test("at the top of the page, clears the intro card, the sign and Download CV (the reported overlap)", async ({ page }) => {
    await open(page, 390, 844);
    const theme = await box(page, THEME);
    const motion = await box(page, MOTION);
    for (const area of ["intro", "connect", "actions"]) {
      const card = await box(page, `[data-bento-area="${area}"]`);
      expect(intersects(theme, card), `theme toggle covers ${area}`).toBe(false);
      expect(intersects(motion, card), `motion toggle covers ${area}`).toBe(false);
    }
  });

  test("at the bottom of the page, the last card scrolls clear of the dock", async ({ page }) => {
    await open(page, 390, 844);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForFunction(
      () => Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) < 2,
    );

    const last = await box(page, '[data-bento-area="certifications"]');
    const dock = await box(page, DOCK);
    expect(last.y + last.height, "last card ends under the dock").toBeLessThanOrEqual(dock.y);
  });
});
