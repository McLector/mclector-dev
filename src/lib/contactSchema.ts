import { z } from "zod";

/**
 * Stream F — the ONE definition of a valid contact submission.
 *
 * Imported by both `src/features/contact/ContactDialog.tsx` (client-side
 * validation, so a typo never costs a round trip) and `api/contact.ts`
 * (server-side validation, because the client is not a security boundary).
 * Sharing the module is what makes it impossible for the two to drift —
 * see docs/contracts.md, "Contact form request/response shape".
 *
 * Everything here is pure and free of `Date.now()`: the spam heuristics
 * take `now` as a parameter so they can be tested at their exact
 * boundaries instead of with sleeps.
 */

/** Longest name we will render into an email subject. */
export const MAX_NAME_LENGTH = 80;
/** Longest address we will accept (RFC allows more; nobody sane uses it). */
export const MAX_EMAIL_LENGTH = 120;
export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 2000;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please tell me your name.")
    .max(MAX_NAME_LENGTH, `Keep your name under ${MAX_NAME_LENGTH} characters.`),
  email: z
    .email("That does not look like an email address.")
    .max(MAX_EMAIL_LENGTH, `Keep your address under ${MAX_EMAIL_LENGTH} characters.`),
  message: z
    .string()
    .trim()
    .min(MIN_MESSAGE_LENGTH, `Please write at least ${MIN_MESSAGE_LENGTH} characters.`)
    .max(MAX_MESSAGE_LENGTH, `Please keep it under ${MAX_MESSAGE_LENGTH} characters.`),
  // Honeypot: a real browser never fills this, so anything but "" is a bot.
  // It is `z.literal("")` rather than `.optional()` so a payload that omits
  // the field entirely (a naive scripted POST) also fails.
  company: z.literal("", "Unexpected value."),
  startedAt: z
    .number("A client timestamp is required.")
    .finite("A client timestamp is required."),
});

export type ContactPayload = z.infer<typeof contactSchema>;

/** The flat, one-message-per-field shape the 400 response carries. */
export type FieldErrors = Record<string, string>;

/**
 * Collapse a ZodError into `{ field: message }`, one message per field —
 * exactly the `errors` object docs/contracts.md specifies for the 400
 * response, and exactly what the dialog maps back onto its inputs.
 *
 * The first issue for a field wins: showing a user two contradictory
 * complaints about one input is worse than showing the most relevant one.
 * A pathless (whole-payload) issue is filed under `_form`.
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/* ------------------------------------------------------------------ *
 * Spam heuristics — pure functions, `now` always injected.
 * ------------------------------------------------------------------ */

/** A human cannot read the form and write 10+ characters in under 3s. */
export const MIN_FILL_MS = 3_000;
/** A form open for over 30 minutes is a stale tab or a replayed payload. */
export const MAX_FORM_AGE_MS = 30 * 60 * 1000;
/** More than this many links in a message reads as link spam. */
export const MAX_LINKS = 4;

const LINK_PATTERN = /(?:https?:\/\/|www\.)/gi;

/**
 * The time trap. `now` is a parameter, never `Date.now()`, so every
 * boundary (exactly MIN_FILL_MS, exactly MAX_FORM_AGE_MS) is testable.
 * A `startedAt` in the future is also trapped: that is either a forged
 * payload or a clock so skewed the check is meaningless anyway.
 */
export function isTimeTrapped(payload: { startedAt: number }, now: number): boolean {
  const elapsed = now - payload.startedAt;
  return elapsed < MIN_FILL_MS || elapsed > MAX_FORM_AGE_MS;
}

/** How many URL-ish tokens the message contains. */
export function countLinks(message: string): number {
  return message.match(LINK_PATTERN)?.length ?? 0;
}

export function hasTooManyLinks(message: string): boolean {
  return countLinks(message) > MAX_LINKS;
}

/**
 * The combined "do not deliver this" predicate, for callers that do not
 * need to know WHICH heuristic fired. `api/contact.ts` deliberately uses
 * the granular ones instead, because the two failures get different
 * responses (a throttled human is told to wait; a link-spammer is
 * silently dropped and told nothing).
 */
export function isSpammy(
  payload: { startedAt: number; message: string },
  now: number,
): boolean {
  return isTimeTrapped(payload, now) || hasTooManyLinks(payload.message);
}
