import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { content } from "@/content";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  contactSchema,
  toFieldErrors,
  MAX_MESSAGE_LENGTH,
  type FieldErrors,
} from "@/lib/contactSchema";

/**
 * Stream F — the contact dialog. Frozen contract (docs/contracts.md):
 *   <ContactDialog open={boolean} onClose={() => void} />
 * Opened by Stream A's ActionsRow via `onContact`, wired in App.tsx.
 *
 * It reads `content` directly rather than taking `profile` as a prop: the
 * "cards take content as props" rule in docs/contracts.md covers the
 * components rendered INSIDE BentoGrid, and this dialog is not one of them
 * — its props are frozen to `{ open, onClose }`, so the `mailto:` fallback
 * address has to come from somewhere.
 *
 * Validation uses the same zod schema as api/contact.ts
 * (src/lib/contactSchema.ts), so a message the client accepts is one the
 * server accepts. The client check exists to save a round trip, not to
 * secure anything.
 *
 * All five response shapes from docs/contracts.md are handled distinctly —
 * in particular 503, where the whole point is to hand the visitor a
 * `mailto:` link so the message they just wrote is not lost.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

/** How long the success message stays up before the dialog closes itself. */
const SUCCESS_CLOSE_DELAY_MS = 2_500;

type Phase =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "rate-limited" }
  | { kind: "not-configured" }
  | { kind: "error" };

const EMPTY_VALUES = { name: "", email: "", message: "", company: "" };

/** Narrow an unknown JSON body to the `errors` map of a 400 response. */
function readFieldErrors(body: unknown): FieldErrors {
  if (typeof body !== "object" || body === null) return {};
  const errors = (body as { errors?: unknown }).errors;
  if (typeof errors !== "object" || errors === null) return {};
  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

export function ContactDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const baseId = useId();
  const ids = {
    title: `${baseId}-title`,
    name: `${baseId}-name`,
    email: `${baseId}-email`,
    message: `${baseId}-message`,
    company: `${baseId}-company`,
  };

  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const firstFieldRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef(0);
  // A ref, not the `phase` state: two clicks dispatched inside one React
  // batch would both read the pre-render `phase` and both POST.
  const inFlightRef = useRef(false);

  // Fresh form (and a fresh time-trap clock) every time it opens.
  useEffect(() => {
    if (!open) return;
    startedAtRef.current = Date.now();
    setValues(EMPTY_VALUES);
    setErrors({});
    setPhase({ kind: "idle" });
    inFlightRef.current = false;
  }, [open]);

  // Focus goes to the first real field — not the dialog container — so a
  // keyboard user can start typing immediately.
  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Close shortly after a success, so the visitor reads the confirmation
  // instead of the dialog vanishing mid-thought.
  useEffect(() => {
    if (phase.kind !== "success") return undefined;
    const timer = setTimeout(onClose, SUCCESS_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase.kind, onClose]);

  const send = useCallback(async () => {
    if (inFlightRef.current) return;

    const payload = {
      ...values,
      startedAt: startedAtRef.current || Date.now(),
    };

    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      // Client validation failed: show it and spend no network at all.
      setErrors(toFieldErrors(parsed.error));
      setPhase({ kind: "idle" });
      return;
    }

    inFlightRef.current = true;
    setErrors({});
    setPhase({ kind: "submitting" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 200) {
        setValues(EMPTY_VALUES);
        setPhase({ kind: "success" });
      } else if (response.status === 400) {
        const body = await response.json().catch(() => null);
        const fieldErrors = readFieldErrors(body);
        setErrors(
          Object.keys(fieldErrors).length > 0
            ? fieldErrors
            : { _form: "Something in the form was rejected. Please check it and try again." },
        );
        setPhase({ kind: "idle" });
      } else if (response.status === 429) {
        setPhase({ kind: "rate-limited" });
      } else if (response.status === 503) {
        setPhase({ kind: "not-configured" });
      } else {
        // 500, and anything else unexpected (a 502 HTML gateway page, say)
        // lands here rather than throwing.
        setPhase({ kind: "error" });
      }
    } catch {
      // Offline, DNS failure, aborted request — never a crash.
      setPhase({ kind: "error" });
    } finally {
      inFlightRef.current = false;
    }
  }, [values]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send();
  };

  const submitting = phase.kind === "submitting";

  const fieldProps = (key: "name" | "email" | "message") => {
    const message = errors[key];
    return {
      id: ids[key],
      name: key,
      value: values[key],
      "aria-invalid": message ? ("true" as const) : undefined,
      "aria-describedby": message ? `${ids[key]}-error` : undefined,
      onChange: (event: { target: { value: string } }) =>
        setValues((current) => ({ ...current, [key]: event.target.value })),
    };
  };

  const fieldError = (key: "name" | "email" | "message") =>
    errors[key] ? (
      <p id={`${ids[key]}-error`} className="text-xs text-[#ff9b9b]">
        {errors[key]}
      </p>
    ) : null;

  const inputClass = cn(
    "w-full rounded-xl bg-[color-mix(in_oklab,var(--color-text-primary)_6%,transparent)] px-3 py-2 text-sm",
    "text-[var(--color-text-primary)] ring-1 ring-[var(--glass-border)]",
    "outline-none placeholder:text-[var(--color-text-muted)]",
    "focus-visible:ring-2 focus-visible:ring-[var(--color-accent-blue)]",
  );
  const labelClass = "text-xs text-[var(--color-text-secondary)]";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="contact-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.12 : 0.18 }}
        >
      <div
        data-testid="contact-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        data-testid="contact-dialog"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: reducedMotion ? 0.12 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative z-10 w-full max-w-md rounded-3xl p-6",
          "bg-[var(--color-surface-raised)] shadow-2xl ring-1 ring-[var(--glass-border)]",
          "max-h-[90dvh] overflow-y-auto",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id={ids.title}
            className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text-primary)]"
          >
            Contact me
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact form"
            className="rounded-full px-2 py-1 text-sm text-[var(--color-text-muted)] transition-transform duration-200 hover:text-[var(--color-text-primary)] active:scale-[0.97]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate data-testid="contact-form">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.name} className={labelClass}>
                Your name
              </label>
              <input
                {...fieldProps("name")}
                ref={firstFieldRef}
                type="text"
                autoComplete="name"
                maxLength={200}
                className={inputClass}
              />
              {fieldError("name")}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={ids.email} className={labelClass}>
                Your email
              </label>
              <input
                {...fieldProps("email")}
                type="email"
                autoComplete="email"
                maxLength={200}
                className={inputClass}
              />
              {fieldError("email")}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={ids.message} className={labelClass}>
                Message
              </label>
              <textarea
                {...fieldProps("message")}
                rows={5}
                maxLength={MAX_MESSAGE_LENGTH}
                className={cn(inputClass, "resize-y")}
              />
              {fieldError("message")}
            </div>

            {/*
              Honeypot. Hidden off-screen rather than with `display: none` or
              `visibility: hidden` — plenty of spam bots specifically skip
              fields hidden those two ways, and filling this one is exactly
              the behaviour we want to catch. `tabIndex={-1}` plus
              `aria-hidden` keep it away from keyboard and screen-reader
              users, who would otherwise be walked into a trap meant for bots.
            */}
            <div
              data-testid="contact-company-field"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                top: "auto",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }}
            >
              <label htmlFor={ids.company}>Company (leave this empty)</label>
              <input
                id={ids.company}
                data-testid="contact-company"
                name="company"
                type="text"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                value={values.company}
                onChange={(event) =>
                  setValues((current) => ({ ...current, company: event.target.value }))
                }
              />
            </div>

            <input
              type="hidden"
              name="startedAt"
              data-testid="contact-started-at"
              value={startedAtRef.current}
              readOnly
            />
          </div>

          {errors._form ? (
            <p role="alert" className="mt-3 text-xs text-[#ff9b9b]">
              {errors._form}
            </p>
          ) : null}

          {phase.kind === "rate-limited" ? (
            <p
              role="alert"
              data-testid="contact-rate-limited"
              className="mt-3 text-xs text-[#ffd08a]"
            >
              That is a lot of messages in a short time. Please wait a moment and try again.
            </p>
          ) : null}

          {phase.kind === "not-configured" ? (
            <div role="alert" className="mt-3 text-xs text-[var(--color-text-secondary)]">
              <p>Email delivery is not set up yet — but your message is not lost.</p>
              <a
                data-testid="contact-mailto"
                href={`mailto:${content.profile.email}`}
                className="mt-1 inline-block font-semibold text-[var(--color-text-primary)] underline"
              >
                Email me directly at {content.profile.email}
              </a>
            </div>
          ) : null}

          {phase.kind === "error" ? (
            <p role="alert" data-testid="contact-error" className="mt-3 text-xs text-[#ff9b9b]">
              Something went wrong and the message could not be sent.
            </p>
          ) : null}

          {phase.kind === "success" ? (
            <p role="status" data-testid="contact-success" className="mt-3 text-xs text-[#9bffc4]">
              Thank you — your message is on its way.
            </p>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Sending…" : "Send message"}
            </Button>
            {phase.kind === "error" ? (
              <Button type="button" variant="secondary" onClick={() => void send()}>
                Try again
              </Button>
            ) : null}
          </div>
        </form>
      </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
