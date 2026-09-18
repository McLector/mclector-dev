import { test, expect } from "@playwright/test";

/**
 * Stream A e2e — intro / skills / actions only. Deliberately asserts
 * nothing about the contact dialog's contents: ContactDialog is Stream F's
 * and may still be a no-op placeholder. What is asserted here is what
 * Stream A guarantees: the cards render their content and clicking
 * "Contact me" is safe (no throw, no console error).
 */
test.describe("left column", () => {
  test("renders the intro headline", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Hello!");
    await expect(heading).toContainText("Myre Lector");
  });

  test("renders the handle and the bio lead", async ({ page }) => {
    await page.goto("/");
    const intro = page.locator('[data-bento-area="intro"]');
    await expect(intro).toContainText("@McLector");
    await expect(intro).toContainText("4th-year CS student");
  });

  test("renders featured skill chips", async ({ page }) => {
    await page.goto("/");
    const skills = page.locator('[data-bento-area="skills"]');
    await expect(skills).toBeVisible();
    await expect(skills.getByRole("listitem")).not.toHaveCount(0);
    await expect(skills).toContainText("TypeScript");
  });

  test("clicking Contact me is safe and logs no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    const contact = page
      .locator('[data-bento-area="actions"]')
      .getByRole("button", { name: "Contact me" });
    await expect(contact).toBeEnabled();
    await contact.click();

    // The button itself survives the click; the dialog it opens is Stream F's.
    await expect(contact).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("the CV action is present but disabled while no CV exists", async ({ page }) => {
    await page.goto("/");
    const cv = page.locator('[data-bento-area="actions"]').getByRole("button", {
      name: "CV",
      includeHidden: true,
    });
    await expect(cv).toBeVisible();
    await expect(cv).toBeDisabled();
    await expect(cv).toHaveAttribute("aria-disabled", "true");
  });
});
