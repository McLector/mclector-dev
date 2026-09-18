import {
  contactSchema,
  hasTooManyLinks,
  isTimeTrapped,
  toFieldErrors,
} from "../src/lib/contactSchema.js";

/**
 * Stream F — `POST /api/contact`, a Vercel Function.
 *
 * Written against the Web-standard Fetch handler shape that Vercel's
 * Node.js runtime (nodejs22.x, see vercel.json) invokes natively:
 *
 *     export async function POST(request: Request): Promise<Response>
 *
 * That needs no `@vercel/node` SDK and — more usefully — makes the whole
 * endpoint testable by constructing a real `Request` and reading a real
 * `Response`, with nothing mocked but the outbound Resend call.
 *
 * Validation uses the SAME zod schema the client form uses
 * (src/lib/contactSchema.ts), so the two can never disagree; the client
 * check is a courtesy, this one is the boundary.
 *
 * Responses are exactly the five in docs/contracts.md:
 *   200 { ok: true } · 400 { ok: false, errors } · 429 rate-limited ·
 *   503 not-configured · 500 server-error
 *
 * A relative import is used for the schema rather than the `@/` alias:
 * the alias is a Vite/Vitest resolution concern and does not exist in the
 * function's runtime.
 */

// `process` is not in this tsconfig's `types` (tsconfig.app.json pins
// ["vite/client"], and no stream may edit it). Declaring the one member we
// need keeps the handler type-safe without touching shared config or
// adding @types/node to a browser-facing project.
declare const process: { env: Record<string, string | undefined> };

/** Inbox for delivered messages — matches `Profile.email` in src/content. */
const TO_EMAIL = "moradamyre@gmail.com";
/**
 * Resend's shared onboarding sender, which works with any API key and no
 * verified domain. Swap for a domain address once one exists.
 */
const FROM_EMAIL = "onboarding@resend.dev";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Per-IP throttle. Tune these two and nothing else changes. */
export const RATE_LIMIT_MAX = 3;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Best-effort, per-instance rate limiting — explicitly NOT a guarantee.
 * Serverless instances are ephemeral and horizontally scaled, so this
 * catches a single bot hammering one warm instance and nothing more.
 * docs/contracts.md accepts that; a real limiter would need shared state
 * (KV/Redis), which is a dependency this project does not have.
 */
const recentByIp = new Map<string, number[]>();

/** Test seam: module-level state would otherwise leak between test cases. */
export function resetRateLimit(): void {
  recentByIp.clear();
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  // `x-forwarded-for` is "client, proxy1, proxy2" — only the first hop is
  // the caller; the rest are our own infrastructure.
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "unknown";
}

/** Records this hit and reports whether the caller has now exceeded the limit. */
function exceedsRateLimit(ip: string, now: number): boolean {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (recentByIp.get(ip) ?? []).filter((at) => at > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    recentByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  recentByIp.set(ip, recent);
  return false;
}

/**
 * Header-injection defence. Any user-controlled value that lands in (or
 * near) an email header — the subject, the display name, `reply_to` — is
 * scrubbed of CR, LF and every other control character, so a crafted
 * `"Evil\r\nBcc: victim@example.com"` becomes inert text instead of an
 * extra header. Runs of whitespace collapse so the result still reads.
 */
export function sanitizeHeaderValue(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex -- stripping control chars is the point
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const rateLimited = () => json({ ok: false, reason: "rate-limited" }, 429);
/** The silent drop: a bot learns nothing from a 200. */
const silentOk = () => json({ ok: true }, 200);

export async function POST(request: Request): Promise<Response> {
  // 1. Body must be JSON at all.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, errors: { _form: "Expected a JSON body." } }, 400);
  }

  // 2. Shared-schema validation.
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = toFieldErrors(parsed.error);
    // The honeypot failing is the ONLY validation failure we hide: telling a
    // bot which field gave it away is free tuning information. A payload
    // whose only problem is `company` is answered as if it succeeded.
    if (Object.keys(errors).length === 1 && "company" in errors) return silentOk();
    return json({ ok: false, errors }, 400);
  }

  const payload = parsed.data;
  const now = Date.now();

  // 3. Honeypot is already enforced by the schema (`company: ""`); this is
  //    the belt-and-braces re-check, and the link heuristic rides with it
  //    because both are silent drops.
  if (payload.company !== "" || hasTooManyLinks(payload.message)) return silentOk();

  // 4. Time trap — too fast to be human, or a stale/replayed form.
  if (isTimeTrapped(payload, now)) return rateLimited();

  // 5. Best-effort per-IP throttle (see `recentByIp`).
  if (exceedsRateLimit(clientIp(request), now)) return rateLimited();

  // 6. No key configured: say so honestly so the UI can offer mailto:,
  //    rather than throwing a 500 that looks like our bug.
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return json({ ok: false, reason: "not-configured" }, 503);

  // 7. Deliver. Every user-supplied value that touches a header-ish field
  //    is sanitized first; the message body stays verbatim (it is a body,
  //    not a header) but is never interpreted as HTML.
  const safeName = sanitizeHeaderValue(payload.name);
  const safeEmail = sanitizeHeaderValue(payload.email);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Portu-Folio Contact <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        reply_to: safeEmail,
        subject: `Portfolio message from ${safeName}`,
        text: [
          `From: ${safeName} <${safeEmail}>`,
          "",
          payload.message,
        ].join("\n"),
      }),
    });

    if (!response.ok) return json({ ok: false, reason: "server-error" }, 500);
  } catch {
    // Never let a rejection escape: an unhandled rejection in a serverless
    // function is an opaque platform 500 with no response shape at all.
    return json({ ok: false, reason: "server-error" }, 500);
  }

  // 8. Delivered.
  return json({ ok: true }, 200);
}
