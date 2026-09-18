import { test, expect, type Page } from "@playwright/test";

/**
 * Stream E — `#/project/:id` (docs/contracts.md). The point of routing the
 * detail view through the hash rather than component state is that the URL
 * is the source of truth: a pasted link opens the detail view with no click,
 * and Back/Escape put it away again. These tests exercise exactly that.
 */

const DIALOG = '[data-testid="project-overlay"]';
const ROW = '[data-bento-area="work"] [data-project-row]';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("project detail overlay", () => {
  test("a deep link opens the detail view directly on load, with no click", async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto("/#/project/eiyu-system");

    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByRole("heading", { name: "Eiyu-System" })).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("clicking a row opens the overlay and updates the URL hash", async ({ page }) => {
    await page.goto("/");

    const firstRow = page.locator(ROW).first();
    await expect(firstRow).toBeVisible();
    const id = await firstRow.getAttribute("data-project-row");

    await firstRow.click();

    await expect(page.locator(DIALOG)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#/project/${id}$`));
  });

  test("Escape closes the overlay, clears the hash and returns focus to the row", async ({
    page,
  }) => {
    await page.goto("/");

    const firstRow = page.locator(ROW).first();
    const id = await firstRow.getAttribute("data-project-row");
    await firstRow.click();
    await expect(page.locator(DIALOG)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator(DIALOG)).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe("");

    const focusedRow = await page.evaluate(
      () => document.activeElement?.getAttribute("data-project-row") ?? null,
    );
    expect(focusedRow).toBe(id);
  });

  test("Back after opening a project returns to the grid", async ({ page }) => {
    await page.goto("/");
    await page.locator(ROW).first().click();
    await expect(page.locator(DIALOG)).toBeVisible();

    await page.goBack();

    await expect(page.locator(DIALOG)).toHaveCount(0);
    await expect(page.locator('[data-bento-area="work"]')).toBeVisible();
  });

  test("the grid behind the overlay is inert while it is open", async ({ page }) => {
    await page.goto("/#/project/eiyu-system");
    await expect(page.locator(DIALOG)).toBeVisible();

    await expect(page.locator("main")).toHaveAttribute("inert", "");

    await page.keyboard.press("Escape");
    await expect(page.locator(DIALOG)).toHaveCount(0);
    await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  });

  test("an unknown slug renders the grid normally, with no dialog and no console error", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);

    await page.goto("/#/project/does-not-exist");

    await expect(page.locator('[data-bento-area="work"]')).toBeVisible();
    await expect(page.locator(DIALOG)).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a malformed hash is equally harmless", async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto("/#/project/../../etc");

    await expect(page.locator('[data-bento-area="work"]')).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("external links in the overlay open in a new tab, safely", async ({ page }) => {
    await page.goto("/#/project/eiyu-system");
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible();

    const external = dialog.locator('a[href^="https://"]');
    const count = await external.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      await expect(external.nth(i)).toHaveAttribute("target", "_blank");
      await expect(external.nth(i)).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
