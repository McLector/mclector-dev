import { test, expect, type Page } from "@playwright/test";

/**
 * Stream F — end-to-end coverage of the contact dialog against every one of
 * the five responses in docs/contracts.md. The endpoint itself is unit
 * tested (api/contact.test.ts); here the network is stubbed with
 * `page.route` so each response shape is exercised as the visitor
 * experiences it, deterministically and without sending real email.
 */

const VALID = {
  name: "Myre Lector",
  email: "someone@example.com",
  message: "Hello! I would like to talk about an internship opportunity.",
};

/** Stub /api/contact with a fixed status + body. Returns the request count. */
async function stubContact(page: Page, status: number, body: unknown) {
  const calls: string[] = [];
  await page.route("**/api/contact", async (route) => {
    calls.push(route.request().postData() ?? "");
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  return calls;
}

async function openDialog(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Contact me", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function fillAndSend(page: Page) {
  await page.getByLabel("Your name").fill(VALID.name);
  await page.getByLabel("Your email").fill(VALID.email);
  await page.getByLabel("Message").fill(VALID.message);
  // The server-side time trap rejects anything submitted under 3s after the
  // form opened; wait it out so the happy path is a genuine happy path.
  await page.waitForTimeout(3_200);
  await page.getByRole("button", { name: /send message/i }).click();
}

test.describe("contact dialog", () => {
  test("opens from the ActionsRow 'Contact me' button and closes with Escape", async ({ page }) => {
    const dialog = await openDialog(page);
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(page.getByLabel("Your name")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("closes on a backdrop click", async ({ page }) => {
    await openDialog(page);
    await page.getByTestId("contact-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("blocks an empty submission before it ever reaches the network", async ({ page }) => {
    const calls = await stubContact(page, 200, { ok: true });
    await openDialog(page);
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText(/please tell me your name/i)).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  test("the honeypot field is present but off-screen and untabbable", async ({ page }) => {
    await openDialog(page);
    const honeypot = page.getByTestId("contact-company");
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
    const box = await page.getByTestId("contact-company-field").boundingBox();
    // Off-screen to the left, not display:none — a bot that ignores CSS
    // still sees and fills it.
    expect(box === null || box.x < 0).toBe(true);
  });

  test("200 — the happy path confirms and then closes itself", async ({ page }) => {
    const calls = await stubContact(page, 200, { ok: true });
    await openDialog(page);
    await fillAndSend(page);

    await expect(page.getByTestId("contact-success")).toBeVisible();
    await expect(page.getByTestId("contact-success")).toHaveText(/on its way/i);
    expect(calls).toHaveLength(1);

    const sent = JSON.parse(calls[0]);
    expect(sent).toMatchObject({ name: VALID.name, email: VALID.email, company: "" });
    expect(Number.isFinite(sent.startedAt)).toBe(true);

    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 6_000 });
  });

  test("400 — the server's field errors land on the matching inputs", async ({ page }) => {
    await stubContact(page, 400, {
      ok: false,
      errors: { email: "Server says this address is unreachable." },
    });
    await openDialog(page);
    await fillAndSend(page);

    await expect(page.getByText("Server says this address is unreachable.")).toBeVisible();
    await expect(page.getByLabel("Your email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("429 — the visitor is asked to wait, not shown a failure", async ({ page }) => {
    await stubContact(page, 429, { ok: false, reason: "rate-limited" });
    await openDialog(page);
    await fillAndSend(page);

    await expect(page.getByTestId("contact-rate-limited")).toBeVisible();
    await expect(page.getByTestId("contact-rate-limited")).toHaveText(/wait a moment/i);
    await expect(page.getByTestId("contact-mailto")).toHaveCount(0);
  });

  test("503 — the mailto: fallback is revealed so the message is not lost", async ({ page }) => {
    await stubContact(page, 503, { ok: false, reason: "not-configured" });
    await openDialog(page);
    await fillAndSend(page);

    const fallback = page.getByTestId("contact-mailto");
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveAttribute("href", "mailto:moradamyre@gmail.com");
  });

  test("500 — the failure is explained and a retry is offered", async ({ page }) => {
    await stubContact(page, 500, { ok: false, reason: "server-error" });
    await openDialog(page);
    await fillAndSend(page);

    await expect(page.getByTestId("contact-error")).toBeVisible();
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  });

  test("a dropped connection is caught and retryable, never a crash", async ({ page }) => {
    await page.route("**/api/contact", (route) => route.abort("failed"));
    await openDialog(page);
    await fillAndSend(page);

    await expect(page.getByTestId("contact-error")).toBeVisible();
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  });
});
