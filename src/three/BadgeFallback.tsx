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
}: {
  profile: Profile;
  /** Why the 3D scene was skipped — surfaced as a data attribute for e2e. */
  reason?: "no-webgl" | "reduced-motion" | "low-tier" | "loading" | "offscreen";
}) {
  const { badge, avatar, displayName } = profile;
  const { from, to } = avatar.placeholder;
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
        className="h-8 w-2 rounded-full"
        style={{ backgroundImage: `linear-gradient(to bottom, ${from}, ${to})` }}
      />

      <div
        role="img"
        aria-label={`${displayName} — ${badge.subtitle || badge.caption}`}
        data-badge-surface
        className="relative flex w-full max-w-[13rem] flex-col items-center gap-3 rounded-2xl px-4 py-5 text-center ring-1 ring-white/15 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)]"
        style={{ backgroundImage: `linear-gradient(145deg, ${from}, ${to})`, aspectRatio: "1.6 / 2.25" }}
      >
        {/* Punch hole */}
        <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-black/45" />

        <span
          className="grid aspect-square w-[46%] place-items-center overflow-hidden rounded-xl bg-black/30 ring-1 ring-white/25"
          style={avatar.src ? undefined : { backgroundImage: `linear-gradient(135deg, ${to}, ${from})` }}
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
              className="text-xl font-semibold text-white drop-shadow"
            >
              {monogram}
            </span>
          )}
        </span>

        <span className="flex w-full flex-col gap-0.5">
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
          <span className="rounded-full bg-black/45 px-2 py-0.5 font-mono text-[0.625rem] tracking-wider text-white/90">
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
