import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  contactSchema,
  countLinks,
  hasTooManyLinks,
  isSpammy,
  isTimeTrapped,
  toFieldErrors,
  MAX_FORM_AGE_MS,
  MAX_LINKS,
  MIN_FILL_MS,
} from "./contactSchema";

/**
 * Stream F — the single schema imported by BOTH the client form and
 * api/contact.ts (docs/contracts.md), so the two can never disagree about
 * what a valid submission is. Every constraint below is asserted from both
 * sides of its boundary, because an off-by-one here is a silently rejected
 * real message.
 */

const valid = {
  name: "Myre Lector",
  email: "someone@example.com",
  message: "Hello there, I would like to talk about an internship.",
  company: "",
  startedAt: 1_700_000_000_000,
};

/** A payload with one field overridden — keeps each test to its own axis. */
function withField(field: string, value: unknown) {
  return { ...valid, [field]: value };
}

describe("contactSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = contactSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("strips unknown extra keys rather than failing on them", () => {
    const result = contactSchema.safeParse({ ...valid, extra: "nope" });
    expect(result.success).toBe(true);
    expect(result.success && "extra" in result.data).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(contactSchema.safeParse(null).success).toBe(false);
    expect(contactSchema.safeParse("nope").success).toBe(false);
    expect(contactSchema.safeParse([]).success).toBe(false);
  });

  describe("name", () => {
    it("rejects an empty name", () => {
      expect(contactSchema.safeParse(withField("name", "")).success).toBe(false);
    });

    it("rejects a whitespace-only name", () => {
      expect(contactSchema.safeParse(withField("name", "   ")).success).toBe(false);
    });

    it("accepts a name of exactly 80 characters", () => {
      expect(contactSchema.safeParse(withField("name", "a".repeat(80))).success).toBe(true);
    });

    it("rejects a name of 81 characters", () => {
      expect(contactSchema.safeParse(withField("name", "a".repeat(81))).success).toBe(false);
    });

    it("trims surrounding whitespace off the parsed name", () => {
      const result = contactSchema.safeParse(withField("name", "  Myre  "));
      expect(result.success && result.data.name).toBe("Myre");
    });

    it("rejects a missing or non-string name", () => {
      expect(contactSchema.safeParse(withField("name", undefined)).success).toBe(false);
      expect(contactSchema.safeParse(withField("name", 42)).success).toBe(false);
    });
  });

  describe("email", () => {
    it.each(["a@b", "nodomain", "", "no@tld.", "spaces in@example.com", "@example.com"])(
      "rejects the invalid address %j",
      (email) => {
        expect(contactSchema.safeParse(withField("email", email)).success).toBe(false);
      },
    );

    it.each(["someone@example.com", "first.last+tag@sub.example.co.uk"])(
      "accepts the valid address %j",
      (email) => {
        expect(contactSchema.safeParse(withField("email", email)).success).toBe(true);
      },
    );

    it("rejects an address longer than 120 characters", () => {
      const long = `${"a".repeat(112)}@example.com`; // 124 chars
      expect(long.length).toBeGreaterThan(120);
      expect(contactSchema.safeParse(withField("email", long)).success).toBe(false);
    });

    it("accepts an address of exactly 120 characters", () => {
      const exact = `${"a".repeat(108)}@example.com`; // 108 + 12
      expect(exact).toHaveLength(120);
      expect(contactSchema.safeParse(withField("email", exact)).success).toBe(true);
    });

    it("rejects an address carrying a CRLF header-injection payload", () => {
      expect(
        contactSchema.safeParse(withField("email", "a@example.com\r\nBcc: victim@example.com"))
          .success,
      ).toBe(false);
    });
  });

  describe("message", () => {
    it("rejects a message of 9 characters", () => {
      expect(contactSchema.safeParse(withField("message", "a".repeat(9))).success).toBe(false);
    });

    it("accepts a message of exactly 10 characters", () => {
      expect(contactSchema.safeParse(withField("message", "a".repeat(10))).success).toBe(true);
    });

    it("accepts a message of exactly 2000 characters", () => {
      expect(contactSchema.safeParse(withField("message", "a".repeat(2000))).success).toBe(true);
    });

    it("rejects a message of 2001 characters", () => {
      expect(contactSchema.safeParse(withField("message", "a".repeat(2001))).success).toBe(false);
    });

    it("rejects a whitespace-padded message that is too short once trimmed", () => {
      expect(contactSchema.safeParse(withField("message", `   ${"a".repeat(9)}   `)).success).toBe(
        false,
      );
    });
  });

  describe("company (honeypot)", () => {
    it("accepts an empty string", () => {
      expect(contactSchema.safeParse(withField("company", "")).success).toBe(true);
    });

    it("rejects a filled honeypot", () => {
      expect(contactSchema.safeParse(withField("company", "spam")).success).toBe(false);
    });

    it("rejects a missing honeypot field", () => {
      expect(contactSchema.safeParse(withField("company", undefined)).success).toBe(false);
    });
  });

  describe("startedAt", () => {
    it.each([
      ["missing", undefined],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["-Infinity", Number.NEGATIVE_INFINITY],
      ["a string", "1700000000000"],
    ])("rejects %s", (_label, value) => {
      expect(contactSchema.safeParse(withField("startedAt", value)).success).toBe(false);
    });

    it("accepts a finite millisecond timestamp", () => {
      expect(contactSchema.safeParse(withField("startedAt", Date.now())).success).toBe(true);
    });
  });
});

describe("toFieldErrors", () => {
  it("returns an empty object for a successful parse", () => {
    const result = contactSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(toFieldErrors(result.success ? new z.ZodError([]) : result.error)).toEqual({});
  });

  it("maps each failing field to exactly one message", () => {
    const result = contactSchema.safeParse({
      name: "",
      email: "nope",
      message: "short",
      company: "spam",
      startedAt: Number.NaN,
    });
    expect(result.success).toBe(false);
    const errors = result.success ? {} : toFieldErrors(result.error);
    expect(Object.keys(errors).sort()).toEqual([
      "company",
      "email",
      "message",
      "name",
      "startedAt",
    ]);
    for (const value of Object.values(errors)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("keeps the FIRST message when one field has several issues", () => {
    const schema = z.object({ name: z.string().min(5, "too short").regex(/^x/, "must start x") });
    const result = schema.safeParse({ name: "a" });
    const errors = result.success ? {} : toFieldErrors(result.error);
    expect(errors.name).toBe("too short");
  });

  it("files a top-level (pathless) issue under a `_form` key", () => {
    const result = contactSchema.safeParse("not an object");
    const errors = result.success ? {} : toFieldErrors(result.error);
    expect(errors._form).toBeTruthy();
  });

  it("flattens a nested path to its top-level field name", () => {
    const schema = z.object({ a: z.object({ b: z.string() }) });
    const result = schema.safeParse({ a: { b: 1 } });
    const errors = result.success ? {} : toFieldErrors(result.error);
    expect(Object.keys(errors)).toEqual(["a"]);
  });
});

describe("isTimeTrapped — pure, takes `now` as a parameter", () => {
  const started = 1_700_000_000_000;

  it("flags a submission faster than the minimum fill time", () => {
    expect(isTimeTrapped({ startedAt: started }, started + MIN_FILL_MS - 1)).toBe(true);
  });

  it("does not flag a submission at exactly the minimum fill time", () => {
    expect(isTimeTrapped({ startedAt: started }, started + MIN_FILL_MS)).toBe(false);
  });

  it("does not flag a comfortably human submission", () => {
    expect(isTimeTrapped({ startedAt: started }, started + 45_000)).toBe(false);
  });

  it("does not flag a submission at exactly the maximum form age", () => {
    expect(isTimeTrapped({ startedAt: started }, started + MAX_FORM_AGE_MS)).toBe(false);
  });

  it("flags a stale form older than the maximum age", () => {
    expect(isTimeTrapped({ startedAt: started }, started + MAX_FORM_AGE_MS + 1)).toBe(true);
  });

  it("flags a startedAt in the future (clock skew or forgery)", () => {
    expect(isTimeTrapped({ startedAt: started }, started - 1)).toBe(true);
  });

  it("is deterministic — same inputs, same answer, no hidden Date.now()", () => {
    const args = { startedAt: started } as const;
    expect(isTimeTrapped(args, started + 10_000)).toBe(isTimeTrapped(args, started + 10_000));
  });
});

describe("countLinks / hasTooManyLinks", () => {
  it("counts zero links in a plain message", () => {
    expect(countLinks("Hi, I would like to chat about an internship.")).toBe(0);
  });

  it("counts http, https and bare www links", () => {
    expect(
      countLinks("see http://a.com and https://b.com and www.c.com"),
    ).toBe(3);
  });

  it("is case insensitive", () => {
    expect(countLinks("HTTPS://A.COM WWW.B.COM")).toBe(2);
  });

  it("does not flag a message at exactly the link limit", () => {
    const four = Array.from({ length: MAX_LINKS }, (_, i) => `https://x${i}.com`).join(" ");
    expect(countLinks(four)).toBe(MAX_LINKS);
    expect(hasTooManyLinks(four)).toBe(false);
  });

  it("flags a message with more than the link limit", () => {
    const five = Array.from({ length: MAX_LINKS + 1 }, (_, i) => `https://x${i}.com`).join(" ");
    expect(countLinks(five)).toBe(MAX_LINKS + 1);
    expect(hasTooManyLinks(five)).toBe(true);
  });
});

describe("isSpammy — the combined pure predicate", () => {
  const started = 1_700_000_000_000;
  const human = started + 10_000;

  it("is false for a human-paced, link-free message", () => {
    expect(isSpammy({ startedAt: started, message: "A totally normal message." }, human)).toBe(
      false,
    );
  });

  it("is true when the time trap fires", () => {
    expect(isSpammy({ startedAt: started, message: "normal" }, started + 100)).toBe(true);
  });

  it("is true when the link heuristic fires", () => {
    const five = Array.from({ length: MAX_LINKS + 1 }, (_, i) => `https://x${i}.com`).join(" ");
    expect(isSpammy({ startedAt: started, message: five }, human)).toBe(true);
  });
});
