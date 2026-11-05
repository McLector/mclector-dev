import type { Profile } from "@/content/types";
import { initialsFrom } from "./textures/initials";

/**
 * The static hologram card — plain DOM and CSS, no WebGL, no physics.
 *
 * ONE component serves every degraded path: no WebGL, the Suspense fallback
 * while the 3D chunk downloads, and the pre-load "offscreen" state. Keeping it
 * single is deliberate — near-identical fallbacks would drift out of sync with
 * `profile.badge` within a release. It is a flat rendition of the 3D hologram
 * (the photo with soft edges, four corner brackets and scanlines; no frame, like the 3D card)
 * rather than the retired lanyard badge, so the swap to the live scene doesn't change the object.
 *
 * It sits on the hologram's projection bay (the stage background PassCard draws from `--stage-bg`), which is
 * deep navy in the dark theme and pale steel glass in the light one. So its text, brackets and scanline wash
 * each carry a `light:` twin: pale on the dark bay, ink on the pale one.
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
        className="relative flex w-full max-w-[15.5rem] flex-col"
        style={{
          // No frame and no pane, like the 3D card. A faint accent wash sits INSIDE the picture's bounds, clear of
          // its feathered edges, so it is covered and never shows as a coloured rim: both accent colours stay
          // literally present as its stops.
          backgroundImage: [
            `radial-gradient(120% 70% at 50% 0%, ${to} 0%, transparent 60%)`,
            `linear-gradient(160deg, ${from} 0%, transparent 70%)`,
          ].join(", "),
          backgroundSize: "86% 45%",
          backgroundPosition: "50% 12%",
          backgroundRepeat: "no-repeat",
          aspectRatio: "0.8",
        }}
      >
        <span className="relative flex min-h-0 flex-1">
          {/* The projected portrait: fills the card, cover-cropped, its edges melting into the stage. */}
          <span
            data-badge-picture
            className="badge-picture-mask relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-[#0a1220]"
          >
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
              className="badge-scanlines pointer-events-none absolute inset-0"
            />
          </span>

          {/* Four corner brackets, just outside the picture: the only mark of the card, as in 3D. */}
          {(
            [
              ["tl", "-top-1 -left-1 border-t border-l"],
              ["tr", "-top-1 -right-1 border-t border-r"],
              ["bl", "-bottom-1 -left-1 border-b border-l"],
              ["br", "-bottom-1 -right-1 border-b border-r"],
            ] as const
          ).map(([corner, edges]) => (
            <span
              key={corner}
              aria-hidden="true"
              data-badge-corner={corner}
              className={`pointer-events-none absolute h-[12%] w-[15%] border-[#5ec8ff]/90 light:border-[#1a86f5] ${edges}`}
            />
          ))}
        </span>

        <span className="flex w-full flex-col gap-0.5 px-1 pt-2 pb-0.5 text-center">
          <span
            data-badge-title
            className="truncate text-sm font-bold text-[#eafaff] light:text-[oklch(0.21_0.04_262)]"
            title={badge.title}
          >
            {badge.title}
          </span>
          <span
            data-badge-subtitle
            className="truncate text-[0.625rem] font-medium text-[#eafaff]/75 light:text-[oklch(0.34_0.04_262)]"
          >
            {badge.subtitle}
          </span>
        </span>

        {badge.idLabel ? (
          <span className="mx-auto mb-0.5 rounded-full bg-black/40 px-2 py-0.5 font-mono text-[0.625rem] tracking-wider text-[#eafaff]/90 ring-1 ring-[color-mix(in_oklab,var(--arc)_40%,transparent)] light:bg-white/55 light:text-[oklch(0.21_0.04_262)]">
            {badge.idLabel}
          </span>
        ) : null}
      </div>

      <p className="font-mono text-[0.625rem] tracking-[0.18em] text-[var(--color-text-muted)] uppercase light:text-[var(--stage-caption)]">
        {badge.caption}
      </p>
    </div>
  );
}
