import type { ReactNode } from "react";
import type { SocialIconName } from "@/content/types";

/**
 * An inline SVG set — no icon library, per docs/contracts.md (a new dependency
 * is a request to the integrator, and seven glyphs do not earn one). Every
 * member of the `SocialIconName` union has an entry, so a social added to
 * content later can never render a hole.
 *
 * Most glyphs are hand-rolled. The exception is Upwork, whose path is pasted
 * verbatim from simple-icons (`upwork`, CC0-1.0; the trademark remains
 * Upwork's) — pasted rather than imported, so there is still no icon library
 * in this file and it costs no runtime import. It is the very path the
 * approved round-2 mockup rendered.
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
      d="M17.5 3h3l-7 8 8.2 10h-6.4l-5-6.1L4 21H1l7.5-8.6L.6 3H7l4.5 5.6L17.5 3Zm-1 16h1.7L7.6 4.8H5.8L16.5 19Z"
      fill="currentColor"
    />
  ),
  upwork: (
    <path
      d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z"
      fill="currentColor"
    />
  ),
  tiktok: (
    <path
      d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
      fill="currentColor"
    />
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
