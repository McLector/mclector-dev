import type { Profile } from "@/content/types";
import { initialsFrom } from "./textures/initials";

/**
 * The static hologram card — plain DOM and CSS, no WebGL, no physics.
 *
 * ONE component serves every degraded path: no WebGL, the Suspense fallback
 * while the 3D chunk downloads, and the pre-load "offscreen" state. Keeping it
 * single is deliberate — near-identical fallbacks would drift out of sync with
 * `profile.badge` within a release. It is a flat rendition of the 3D hologram
 * (slim arc-reactor frame, the photo, scanlines) rather than the retired
 * lanyard badge, so the swap to the live scene doesn't change the object.
 *
 * It always sits on the hologram's dark projection bay (the stage background
 * PassCard draws from `--stage-bg`), so its light-on-dark text is intentionally
 * theme-independent.
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
  /** Accent override; defaults to the profile placeholder pair. */
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
      <div
        role="img"
        aria-label={`${displayName} — ${badge.subtitle || badge.caption}`}
        data-badge-surface
        className="relative flex w-full max-w-[15.5rem] flex-col overflow-hidden rounded-[14px] p-2 ring-1 ring-[color-mix(in_oklab,var(--arc)_70%,transparent)]"
        style={{
          // A faint accent glow under a dark glass pane: both accent colours
          // stay literally present as the glow's colour stops.
          backgroundColor: "rgba(8, 14, 30, 0.86)",
          backgroundImage: [
            `radial-gradient(120% 70% at 50% 0%, ${to} 0%, transparent 60%)`,
            `linear-gradient(160deg, ${from} 0%, transparent 70%)`,
          ].join(", "),
          aspectRatio: "0.8",
          boxShadow:
            "0 0 34px -8px var(--arc-soft), inset 0 0 0 1px rgba(94, 200, 255, 0.18)",
        }}
      >
        {/* The projected portrait: fills the frame, cover-cropped. */}
        <span className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-[9px] bg-[#0a1220]">
          {avatar.src ? (
            <img
              src={avatar.src}
              alt={avatar.alt}
              className="h-full w-full object-cover object-[48%_35%] [filter:saturate(0.55)_contrast(1.1)_brightness(1.05)_hue-rotate(160deg)]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span
              aria-hidden="true"
              className="text-3xl font-semibold text-[#eafaff] drop-shadow-[0_1px_6px_rgb(0_0_0/0.6)]"
            >
              {monogram}
            </span>
          )}

          {/* Cyan wash + scanlines: the "projected light" look. */}
          <span
            aria-hidden="true"
            data-badge-scanlines
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(94,200,255,0.18), rgba(94,200,255,0.05)), repeating-linear-gradient(0deg, rgba(94,200,255,0.16) 0 1px, transparent 1px 3px)",
            }}
          />
        </span>

        <span className="flex w-full flex-col gap-0.5 px-1 pt-2 pb-0.5 text-center">
          <span
            data-badge-title
            className="truncate text-sm font-bold text-[#eafaff]"
            title={badge.title}
          >
            {badge.title}
          </span>
          <span className="truncate text-[0.625rem] font-medium text-[#eafaff]/75">
            {badge.subtitle}
          </span>
        </span>

        {badge.idLabel ? (
          <span className="mx-auto mb-0.5 rounded-full bg-black/40 px-2 py-0.5 font-mono text-[0.625rem] tracking-wider text-[#eafaff]/90 ring-1 ring-[color-mix(in_oklab,var(--arc)_40%,transparent)]">
            {badge.idLabel}
          </span>
        ) : null}
      </div>

      <p className="font-mono text-[0.625rem] tracking-[0.18em] text-[var(--color-text-muted)] uppercase light:text-[#b8c4e6]">
        {badge.caption}
      </p>
    </div>
  );
}
