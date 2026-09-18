import type { ReactNode } from "react";
import type { SocialIconName } from "@/content/types";

/**
 * A hand-rolled inline SVG set — no icon library, per docs/contracts.md (a
 * new dependency is a request to the integrator, and six glyphs do not earn
 * one). Every member of the `SocialIconName` union has an entry, so a social
 * added to content later can never render a hole.
 *
 * All paths are drawn on a 24×24 box and inherit `currentColor`.
 */
const PATHS: Record<SocialIconName, ReactNode> = {
  github: (
    <path
      d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.93.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85l-.01 2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
      fill="currentColor"
    />
  ),
  linkedin: (
    <>
      <path
        d="M4.5 9h3v10.5h-3V9Zm1.5-5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z"
        fill="currentColor"
      />
      <path
        d="M10 9h2.87v1.44h.04c.4-.74 1.38-1.52 2.84-1.52 3.04 0 3.6 1.94 3.6 4.47v6.11h-3v-5.42c0-1.29-.02-2.95-1.83-2.95-1.83 0-2.11 1.4-2.11 2.85v5.52h-3V9Z"
        fill="currentColor"
      />
    </>
  ),
  email: (
    <>
      <rect
        x="2.75"
        y="5.25"
        width="18.5"
        height="13.5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        fill="none"
      />
      <path
        d="m3.5 7.5 7.34 5.14a2 2 0 0 0 2.32 0L20.5 7.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  x: (
    <path
      d="M3 3h4.6l4.2 5.66L16.8 3H21l-6.86 7.9L21.4 21h-4.6l-4.55-6.12L6.9 21H2.7l7.2-8.3L3 3Zm2.9 1.6 9.9 14.8h1.5L7.4 4.6H5.9Z"
      fill="currentColor"
    />
  ),
  youtube: (
    <>
      <rect
        x="2.75"
        y="5.25"
        width="18.5"
        height="13.5"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.7"
        fill="none"
      />
      <path d="M10.4 9.4 15.2 12l-4.8 2.6V9.4Z" fill="currentColor" />
    </>
  ),
  instagram: (
    <>
      <rect
        x="3.25"
        y="3.25"
        width="17.5"
        height="17.5"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.7"
        fill="none"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </>
  ),
};

/** Decorative by design — the accessible name lives on the enclosing link. */
export function SocialIcon({ name, className }: { name: SocialIconName; className?: string }) {
  return (
    <svg
      data-social-icon={name}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
