import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { BadgeFallback } from "@/three/BadgeFallback";
import { useDocumentVisible } from "./useDocumentVisible";
import { useInView } from "./useInView";
import { useSceneCapability } from "./useSceneCapability";
import { DEFAULT_PASS_THEME_ID, PASS_THEMES, resolvePassTheme } from "./passThemes";
import { PassThemeSwitcher } from "./PassThemeSwitcher";

/**
 * The only import of the 3D tree in the whole app, and it is dynamic. Keeping
 * it here — behind both a capability check and an IntersectionObserver — is
 * what keeps three.js, drei and Rapier's inlined WASM (~600–800 kB gzip) out
 * of the initial bundle, whose budget is < 120 kB gzip.
 */
const LanyardCanvas = lazy(() => import("@/three/LanyardCanvas"));

/**
 * Stream C's entry point. Frozen contract (docs/contracts.md):
 *   <PassCard profile={Profile} />
 *
 * Renders one of exactly two things:
 *  - <BadgeFallback> — no WebGL, prefers-reduced-motion, a tier-0 GPU, still
 *    off-screen, or the 3D chunk still downloading; or
 *  - the lazily-loaded lanyard canvas.
 *
 * `?e2e=1` puts the scene in its deterministic mode — see src/three/e2eMode.ts.
 */
export function PassCard({ profile }: { profile: Profile }) {
  const capability = useSceneCapability();
  const documentVisible = useDocumentVisible();

  // `once` for the download decision: having paid for the chunk we keep it.
  const load = useInView({ rootMargin: "300px", once: true });
  // A second, live observer drives the frameloop gate.
  const visible = useInView({ rootMargin: "0px" });

  const [gpuUnsupported, setGpuUnsupported] = useState(false);
  const onGpuTier = useCallback((gpuTier: number) => {
    setGpuUnsupported(gpuTier <= 0);
  }, []);

  // Depend on the callback refs, not on the hook result objects: the objects
  // are new every render, and a changing ref callback would tear down and
  // rebuild both observers on every single render.
  const loadRef = load.ref;
  const visibleRef = visible.ref;
  const attachRefs = useCallback(
    (node: HTMLDivElement | null) => {
      loadRef(node);
      visibleRef(node);
    },
    [loadRef, visibleRef],
  );

  const reason = capability.reason ?? (gpuUnsupported ? "low-tier" : null);
  const canRender3D = reason === null && capability.config !== null;

  // The selected pass "world" re-skins the badge and the glow behind it.
  const [themeId, setThemeId] = useState(DEFAULT_PASS_THEME_ID);
  const accent = useMemo(() => resolvePassTheme(themeId), [themeId]);

  return (
    <BentoCard area="pass" padded={false}>
      {/* The stage is a bounded height, vertically centred in the (often much
          taller) middle column, so the badge sits at the page's optical centre
          instead of clumping at the top with a void beneath it. */}
      <div
        ref={attachRefs}
        className="relative flex h-full w-full flex-col justify-center gap-3 py-4"
      >
        {/* Local nebula glow behind the badge, tinted to the selected world. It
            layers over the global galaxy nebula so the centre stage reacts to
            the switcher. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[clamp(360px,54vh,600px)] -translate-y-1/2 transition-[background-image] duration-500"
          style={{
            backgroundImage: `radial-gradient(42% 38% at 50% 40%, ${accent.from}59 0%, transparent 70%), radial-gradient(36% 34% at 56% 50%, ${accent.to}40 0%, transparent 72%)`,
          }}
        />

        <div className="relative h-[clamp(340px,50vh,560px)] w-full">
          {!canRender3D ? (
            <BadgeFallback profile={profile} reason={reason ?? "low-tier"} accent={accent} />
          ) : !load.inView ? (
            <BadgeFallback profile={profile} reason="offscreen" accent={accent} />
          ) : (
            <Suspense fallback={<BadgeFallback profile={profile} reason="loading" accent={accent} />}>
              <LanyardCanvas
                profile={profile}
                config={capability.config!}
                accent={accent}
                dpr={capability.dpr}
                active={visible.inView && documentVisible}
                onGpuTier={onGpuTier}
              />
            </Suspense>
          )}
        </div>

        {/* Switcher + caption, anchored below the stage. The static badge
            carries its own caption, so only the canvas path adds one here —
            rendering both would duplicate it in the a11y tree. */}
        <div className="relative z-10 flex flex-col items-center gap-2 pb-3">
          <PassThemeSwitcher themes={PASS_THEMES} value={themeId} onChange={setThemeId} />
          {canRender3D && load.inView ? (
            <p className="text-center font-[family-name:var(--font-mono)] text-[0.625rem] tracking-[0.18em] text-[var(--color-text-muted)] uppercase">
              {profile.badge.caption}
            </p>
          ) : null}
        </div>
      </div>
    </BentoCard>
  );
}
