import type { Profile } from "@/content/types";
import { initialsFrom } from "./textures/initials";

/**
 * The static badge — plain DOM and CSS, no WebGL, no physics.
 *
 * ONE component serves every degraded path (see the plan doc's a11y/perf
 * budget): no WebGL, `prefers-reduced-motion: reduce`, the `unsupported`
 * capability tier, and the Suspense fallback while the 3D chunk downloads.
 * Keeping it single is deliberate — three near-identical fallbacks would
 * drift out of sync with `profile.badge` within a release.
 *
 * Unlike the rest of `src/three/**` this file is pure DOM and is genuinely
 * unit-testable; see BadgeFallback.test.tsx and the note in
 * `vitest.three.config.ts` about the exclusion glob.
 */
export function BadgeFallback({
  profile,
  reason,
  accent,
}: {
  profile: Profile;
  /** Why the 3D scene was skipped — surfaced as a data attribute for e2e. */
  reason?: "no-webgl" | "reduced-motion" | "low-tier" | "loading" | "offscreen";
  /** Pass-theme accent override; defaults to the profile placeholder pair. */
  accent?: { from: string; to: string };
}) {
  const { badge, avatar, displayName } = profile;
  const { from, to } = accent ?? avatar.placeholder;
  const monogram = initialsFrom(displayName);

  return (
    <div
      data-pass-variant="static"
      data-pass-fallback-reason={reason}
      className="flex h-full w-full flex-col items-center justify-center gap-4 p-5"
    >
      {/* The strap stub: enough to read as a lanyard without animating. */}
      <div
        aria-hidden="true"
        className="h-9 w-2.5 rounded-full opacity-90"
        style={{ backgroundImage: `linear-gradient(to bottom, ${from}, ${to})` }}
      />

      <div
        role="img"
        aria-label={`${displayName} — ${badge.subtitle || badge.caption}`}
        data-badge-surface
        className="relative flex w-full max-w-[15.5rem] flex-col items-center gap-3 rounded-2xl px-5 py-6 text-center ring-1 ring-white/12"
        style={{
          // Deep, glossy pass: the accent gradient reads as a GLOW under a dark
          // scrim rather than a flat coloured swatch — mirrors the 3D badge
          // face. Both accent colours stay literally present (asserted by the
          // fallback tests) as the glow's colour stops.
          backgroundColor: "#0b0b12",
          backgroundImage: [
            "linear-gradient(180deg, rgba(8,8,14,0.5) 0%, rgba(6,6,12,0.86) 100%)",
            `radial-gradient(120% 85% at 50% 22%, ${to} 0%, transparent 62%)`,
            `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
          ].join(", "),
          aspectRatio: "1.6 / 2.25",
          boxShadow: `0 22px 50px -20px rgb(0 0 0 / 0.85), 0 0 42px -10px ${from}, inset 0 1px 0 0 rgb(255 255 255 / 0.1)`,
        }}
      >
        {/* Iridescent top sheen — a faint rainbow catch-light. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 30%, rgba(120,200,255,0.35) 45%, rgba(200,140,255,0.35) 55%, transparent 70%)",
          }}
        />

        {/* Punch hole */}
        <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-black/50" />

        <span
          className="relative grid aspect-square w-[46%] place-items-center overflow-hidden rounded-xl bg-[#0a0a10] ring-1 ring-white/20"
          style={
            avatar.src
              ? undefined
              : { boxShadow: `inset 0 0 26px -4px ${to}, inset 0 0 10px -2px ${from}` }
          }
        >
          {avatar.src ? (
            <img
              src={avatar.src}
              alt={avatar.alt}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span
              aria-hidden="true"
              className="text-xl font-semibold text-white drop-shadow-[0_1px_6px_rgb(0_0_0/0.6)]"
            >
              {monogram}
            </span>
          )}
        </span>

        <span className="relative flex w-full flex-col gap-0.5">
          <span
            data-badge-title
            className="truncate text-sm font-bold text-white"
            title={badge.title}
          >
            {badge.title}
          </span>
          <span className="truncate text-[0.625rem] font-medium text-white/75">
            {badge.subtitle}
          </span>
        </span>

        {badge.idLabel ? (
          <span className="relative rounded-full bg-black/50 px-2 py-0.5 font-mono text-[0.625rem] tracking-wider text-white/90 ring-1 ring-white/10">
            {badge.idLabel}
          </span>
        ) : null}
      </div>

      <p className="font-mono text-[0.625rem] tracking-[0.18em] text-[var(--color-text-muted)] uppercase">
        {badge.caption}
      </p>
    </div>
  );
}
