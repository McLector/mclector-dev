// Runs under the repo-wide jsdom environment (vitest.config.ts, which no
// stream may edit). That is fine: Vitest's jsdom environment leaves Node's
// `Request`/`Response`/`fetch` globals in place, so these tests exercise
// the real Web-standard contract Vercel's Node runtime invokes — real
// Request in, real Response out, with only the outbound Resend `fetch`
// stubbed. (A per-file node-environment docblock is NOT usable here: the
// shared src/test/setup.ts touches `window` at import time and would throw.)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  POST,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  resetRateLimit,
  sanitizeHeaderValue,
} from "./contact";
import { MAX_LINKS, MAX_FORM_AGE_MS, MIN_FILL_MS } from "../src/lib/contactSchema";

// See the same declaration in api/contact.ts: tsconfig.app.json pins
// `types: ["vite/client"]` and is not a file this stream may edit, so the
// one `process` member these tests need is declared locally.
declare const process: { env: Record<string, string | undefined> };

const ENDPOINT = "https://portu-folio.test/api/contact";
const RESEND_URL = "https://api.resend.com/emails";

type Body = Record<string, unknown>;

/** A payload that passes every check, filled at a human pace. */
function validBody(overrides: Body = {}): Body {
  return {
    name: "Myre Lector",
    email: "someone@example.com",
    message: "Hello, I would like to talk about an internship opportunity.",
    company: "",
    startedAt: Date.now() - 10_000,
    ...overrides,
  };
}

function post(body: unknown, ip = "203.0.113.1"): Request {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** A distinct IP per test keeps the module-level rate limiter out of the way. */
let ipCounter = 0;
function freshIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter % 250}`;
}

function okResendResponse() {
  return new Response(JSON.stringify({ id: "re_123" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetRateLimit();
  process.env.RESEND_API_KEY = "re_test_key";
  fetchMock = vi.fn(async () => okResendResponse());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("sanitizeHeaderValue — header-injection defence", () => {
  it("strips CR and LF", () => {
    expect(sanitizeHeaderValue("Myre\r\nBcc: victim@example.com")).toBe(
      "Myre Bcc: victim@example.com",
    );
  });

  it("strips lone CR, lone LF and tabs", () => {
    expect(sanitizeHeaderValue("a\rb\nc\td")).toBe("a b c d");
  });

  it("strips other control characters", () => {
    expect(sanitizeHeaderValue("a\u0000b\u001Fc")).toBe("a b c");
  });

  it("collapses the resulting run of spaces and trims", () => {
    expect(sanitizeHeaderValue("  a\r\n\r\n  b  ")).toBe("a b");
  });

  it("leaves an ordinary value untouched", () => {
    expect(sanitizeHeaderValue("Myre Lector")).toBe("Myre Lector");
  });
});

describe("POST /api/contact", () => {
  describe("1. malformed JSON", () => {
    it("returns 400 instead of throwing", async () => {
      const res = await POST(post("{ not json", freshIp()));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.errors).toBeTruthy();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty body", async () => {
      const res = await POST(
        new Request(ENDPOINT, { method: "POST", headers: { "x-forwarded-for": freshIp() } }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("2. schema validation", () => {
    it("returns 400 with a per-field error map", async () => {
      const res = await POST(
        post(validBody({ name: "", email: "nope", message: "short" }), freshIp()),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(Object.keys(body.errors).sort()).toEqual(["email", "message", "name"]);
      expect(typeof body.errors.name).toBe("string");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a CRLF-bearing email address at the schema, before any send", async () => {
      const res = await POST(
        post(validBody({ email: "a@example.com\r\nBcc: victim@example.com" }), freshIp()),
      );
      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("3. honeypot", () => {
    it("returns a silent 200 and sends nothing when `company` is filled", async () => {
      const res = await POST(post(validBody({ company: "Acme Spam Co" }), freshIp()));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does not leak the reason for the drop", async () => {
      const res = await POST(post(validBody({ company: "x" }), freshIp()));
      const text = await res.text();
      expect(text).not.toMatch(/honeypot|spam|company/i);
    });

    it("silently drops a link-spam message the same way", async () => {
      const links = Array.from({ length: MAX_LINKS + 1 }, (_, i) => `https://x${i}.com`).join(" ");
      const res = await POST(post(validBody({ message: `Buy now ${links}` }), freshIp()));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("4. time trap", () => {
    it("returns 429 rate-limited when submitted too fast", async () => {
      const res = await POST(
        post(validBody({ startedAt: Date.now() - (MIN_FILL_MS - 500) }), freshIp()),
      );
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ ok: false, reason: "rate-limited" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns 429 rate-limited for a stale form", async () => {
      const res = await POST(
        post(validBody({ startedAt: Date.now() - (MAX_FORM_AGE_MS + 5_000) }), freshIp()),
      );
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ ok: false, reason: "rate-limited" });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("5. per-IP rate limit", () => {
    it(`allows ${RATE_LIMIT_MAX} submissions then rejects the next from the same IP`, async () => {
      const ip = freshIp();
      for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
        const ok = await POST(post(validBody(), ip));
        expect(ok.status).toBe(200);
      }
      const blocked = await POST(post(validBody(), ip));
      expect(blocked.status).toBe(429);
      expect(await blocked.json()).toEqual({ ok: false, reason: "rate-limited" });
      expect(fetchMock).toHaveBeenCalledTimes(RATE_LIMIT_MAX);
    });

    it("counts each IP separately", async () => {
      const ipA = freshIp();
      for (let i = 0; i < RATE_LIMIT_MAX; i += 1) await POST(post(validBody(), ipA));
      expect((await POST(post(validBody(), ipA))).status).toBe(429);
      expect((await POST(post(validBody(), freshIp()))).status).toBe(200);
    });

    it("uses only the first hop of a multi-hop x-forwarded-for", async () => {
      const client = freshIp();
      const proxy = freshIp();
      for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
        await POST(post(validBody(), `${client}, ${proxy}`));
      }
      expect((await POST(post(validBody(), `${client}, 10.0.0.9`))).status).toBe(429);
    });

    it("forgets submissions older than the window", async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
        const ip = freshIp();
        for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
          await POST(post(validBody({ startedAt: Date.now() - 10_000 }), ip));
        }
        expect((await POST(post(validBody({ startedAt: Date.now() - 10_000 }), ip))).status).toBe(
          429,
        );

        vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_WINDOW_MS + 1_000));
        const after = await POST(post(validBody({ startedAt: Date.now() - 10_000 }), ip));
        expect(after.status).toBe(200);
      } finally {
        vi.useRealTimers();
      }
    });

    it("does not consume rate-limit budget for requests that never get sent", async () => {
      const ip = freshIp();
      for (let i = 0; i < RATE_LIMIT_MAX + 2; i += 1) {
        await POST(post(validBody({ company: "bot" }), ip));
      }
      expect((await POST(post(validBody(), ip))).status).toBe(200);
    });

    it("falls back to a shared bucket when no x-forwarded-for is present", async () => {
      const bare = () =>
        new Request(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(validBody()),
        });
      for (let i = 0; i < RATE_LIMIT_MAX; i += 1) expect((await POST(bare())).status).toBe(200);
      expect((await POST(bare())).status).toBe(429);
    });
  });

  describe("6. RESEND_API_KEY unset", () => {
    it("returns 503 not-configured without attempting a send", async () => {
      delete process.env.RESEND_API_KEY;
      const res = await POST(post(validBody(), freshIp()));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ ok: false, reason: "not-configured" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("treats an empty-string key as unset", async () => {
      process.env.RESEND_API_KEY = "   ";
      const res = await POST(post(validBody(), freshIp()));
      expect(res.status).toBe(503);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("7. Resend delivery", () => {
    it("posts to the Resend REST API with a Bearer token and the right envelope", async () => {
      const res = await POST(post(validBody(), freshIp()));
      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(RESEND_URL);
      expect(init.method).toBe("POST");
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer re_test_key");
      expect(headers["Content-Type"]).toBe("application/json");

      const sent = JSON.parse(String(init.body));
      expect(sent.to).toEqual(["moradamyre@gmail.com"]);
      expect(sent.reply_to).toBe("someone@example.com");
      expect(sent.subject).toContain("Myre Lector");
      expect(sent.text).toContain("internship opportunity");
    });

    it("never lets a CRLF in the name reach the subject or any header field", async () => {
      const attack = "Evil\r\nBcc: victim@example.com";
      const res = await POST(post(validBody({ name: attack }), freshIp()));
      expect(res.status).toBe(200);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const sent = JSON.parse(String(init.body));
      for (const field of [sent.subject, sent.from, sent.reply_to, ...sent.to]) {
        expect(field).not.toMatch(/[\r\n]/);
      }
      // The injected text survives as inert characters — that is the point.
      // Without a line break in front of it, "Bcc:" can never be parsed as a
      // header, so it is neutralised rather than deleted.
      // eslint-disable-next-line no-control-regex -- asserting control chars are gone
      expect(sent.subject).not.toMatch(/[\u0000-\u001F\u007F]/);
      expect(sent.subject).toContain("Evil");
    });

    it("returns 500 server-error when Resend responds with a failure", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "nope" }), { status: 422 }),
      );
      const res = await POST(post(validBody(), freshIp()));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, reason: "server-error" });
    });

    it("returns 500 server-error when the fetch itself rejects", async () => {
      fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
      const res = await POST(post(validBody(), freshIp()));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, reason: "server-error" });
    });

    it("never leaks the API key or the upstream error into the response", async () => {
      fetchMock.mockRejectedValueOnce(new Error("bad key re_test_key"));
      const res = await POST(post(validBody(), freshIp()));
      const text = await res.text();
      expect(text).not.toContain("re_test_key");
      expect(text).not.toContain("bad key");
    });
  });

  describe("8. success", () => {
    it("returns 200 { ok: true } with a JSON content type", async () => {
      const res = await POST(post(validBody(), freshIp()));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      expect(await res.json()).toEqual({ ok: true });
    });
  });
});
