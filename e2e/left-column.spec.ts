import { test, expect } from "@playwright/test";

/**
 * Left column e2e — intro / skills / place. (The CV action and the contact
 * sign now live in the centre column: see centre-column.spec.ts.)
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
    await expect(intro).toContainText("4th-year CS student at De La Salle Lipa University");
  });

  test("shows the Currently Active status and the Open to chips", async ({ page }) => {
    await page.goto("/");
    const intro = page.locator('[data-bento-area="intro"]');
    await expect(intro.getByText("Currently Active")).toBeVisible();
    const chips = intro.getByRole("list", { name: /open to/i }).getByRole("listitem");
    await expect(chips).toHaveText(["Internships", "Freelance", "Entry-level", "Remote"]);
  });

  test("renders featured skill chips", async ({ page }) => {
    await page.goto("/");
    const skills = page.locator('[data-bento-area="skills"]');
    await expect(skills).toBeVisible();
    await expect(skills.getByRole("listitem")).not.toHaveCount(0);
    await expect(skills).toContainText("TypeScript");
  });

  test("the left column holds intro, skills and place — nothing else", async ({ page }) => {
    await page.goto("/");
    const areas = await page
      .locator(".bento__col")
      .first()
      .locator("> [data-bento-area]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-bento-area")));
    expect(areas).toEqual(["intro", "skills", "place"]);
  });
});
