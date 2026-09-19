import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Stream G — the cross-cutting accessibility net for the whole page, not
 * just the certifications card. Other streams' cards land against this.
 *
 * Gate: zero violations of impact `serious` or `critical`. `minor` and
 * `moderate` findings are reported by axe but not failed on, so a stream
 * still mid-flight (grey Phase-0 placeholders, incomplete landmarks) can
 * land without this spec turning into noise — while anything that actually
 * blocks a user still fails the build.
 */

const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

async function assertNoBlockingViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(
    (v) => v.impact != null && BLOCKING_IMPACTS.has(v.impact),
  );
  // The serialized violations become the failure message, so a red run tells
  // you the rule, the impact and the offending nodes without a re-run.
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

test.describe("accessibility", () => {
  test("has no serious or critical axe violations at desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('[data-bento-area="certifications"]').waitFor();
    await assertNoBlockingViolations(page);
  });

  test("has no serious or critical axe violations at mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator('[data-bento-area="certifications"]').waitFor();
    await assertNoBlockingViolations(page);
  });

  test("has no serious or critical axe violations in the twilight (light) theme", async ({ page }) => {
    // Pin the stored choice so this never depends on the OS colour scheme.
    await page.addInitScript(() => localStorage.setItem("mclector-theme", "light"));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('[data-bento-area="certifications"]').waitFor();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await assertNoBlockingViolations(page);
  });

  test("has no serious or critical axe violations in the twilight theme at mobile", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("mclector-theme", "light"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator('[data-bento-area="certifications"]').waitFor();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await assertNoBlockingViolations(page);
  });
});
