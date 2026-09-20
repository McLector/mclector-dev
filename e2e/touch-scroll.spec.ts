import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * A swipe that starts on a card must scroll the page. Reported on a real phone: with a finger on Skills & Tools or
 * Featured Projects the page would not scroll, while a finger anywhere else scrolled fine.
 *
 * Cause: `overscroll-behavior: contain` on those cards' inner lists. On a phone the cards grow to fit their content, so
 * the lists never overflow, and a scroll container with no scrollable overflow is always at its scroll boundary, so
 * `contain` stops the swipe chaining to the page. The rule behind it is pinned deterministically in
 * responsive.spec.ts; this spec drives real touch swipes so the BEHAVIOUR is covered as well. Against the broken build
 * the intro and socials cards scrolled the page and the skills and projects lists moved it by exactly 0px.
 *
 * Runs on the touch-emulating project only (Pixel 7). The swipe is a hand-rolled CDP touchStart / touchMove / touchEnd
 * sequence. `Input.synthesizeScrollGesture` was tried first and, with `gestureSourceType: "touch"`, scrolled nothing even
 * on a card with no scroller, so it could not tell "swallowed" from "the gesture never worked". The intro-card control
 * below is what keeps that distinction honest.
 */
test.skip(
  () => test.info().project.name !== "mobile-chrome",
  "real touch swipes need the touch-emulating project",
);

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

/** Where to put the finger: mid-height of the part of `target` that is on screen, clear of the bottom-right toggle dock. */
async function fingerOn(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const viewportHeight = page.viewportSize()!.height;
  const top = Math.max(box.y, 0);
  const bottom = Math.min(box.y + box.height, viewportHeight);
  return { x: Math.round(box.x + box.width * 0.3), y: Math.round((top + bottom) / 2) };
}

/**
 * Drag one finger vertically. `distance < 0` moves the finger UP the screen, which scrolls the page DOWN (scrollY
 * rises); `distance > 0` moves it down, which scrolls the page up. Chromium's touch slop eats ~15px of the drag.
 */
async function swipe(page: Page, at: { x: number; y: number }, distance: number) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (y: number) => [{ x: at.x, y, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(at.y) });
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touch(at.y + (distance * i) / steps) });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

test.describe("touch scrolling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-bento-area="certifications"]').waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  test("control: a swipe on the intro card scrolls the page (so the gesture itself works)", async ({ page }) => {
    const before = await scrollY(page);
    await swipe(page, await fingerOn(page, page.locator('[data-bento-area="intro"]')), -300);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(before + 50);
  });

  test("a swipe that starts on Skills & Tools scrolls the page", async ({ page }) => {
    const list = page.locator('[data-bento-area="skills"] .overflow-y-auto');
    const at = await fingerOn(page, list);
    const before = await scrollY(page);
    await swipe(page, at, -300);
    await expect
      .poll(() => scrollY(page), { message: "the page did not move under a finger on Skills & Tools" })
      .toBeGreaterThan(before + 50);
  });

  test("a swipe that starts on Featured Projects scrolls the page", async ({ page }) => {
    // The projects list sits near the bottom of the page, so there is more room to scroll UP than down.
    const list = page.locator('[data-testid="projects-list"]');
    const at = await fingerOn(page, list);
    const before = await scrollY(page);
    expect(before, "no room to scroll up, so this probe would prove nothing").toBeGreaterThan(300);
    await swipe(page, at, 300);
    await expect
      .poll(() => scrollY(page), { message: "the page did not move under a finger on Featured Projects" })
      .toBeLessThan(before - 50);
  });
});
