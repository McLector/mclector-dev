import { Suspense, lazy, useCallback, useState } from "react";
import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { BadgeFallback } from "@/three/BadgeFallback";
import { useDocumentVisible } from "./useDocumentVisible";
import { useInView } from "./useInView";
import { useSceneCapability } from "./useSceneCapability";

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

  return (
    <BentoCard area="pass" padded={false}>
      <div ref={attachRefs} className="relative h-full w-full">
        {!canRender3D ? (
          <BadgeFallback profile={profile} reason={reason ?? "low-tier"} />
        ) : !load.inView ? (
          <BadgeFallback profile={profile} reason="offscreen" />
        ) : (
          <Suspense fallback={<BadgeFallback profile={profile} reason="loading" />}>
            <LanyardCanvas
              profile={profile}
              config={capability.config!}
              dpr={capability.dpr}
              active={visible.inView && documentVisible}
              onGpuTier={onGpuTier}
            />
          </Suspense>
        )}

        {/* The static badge carries its own caption; only the canvas needs an
            overlaid one, and rendering both would duplicate it in the a11y tree. */}
        {canRender3D && load.inView ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-mono text-[0.625rem] tracking-[0.18em] text-[var(--color-text-muted)] uppercase">
            {profile.badge.caption}
          </p>
        ) : null}
      </div>
    </BentoCard>
  );
}
