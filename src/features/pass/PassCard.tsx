import { Suspense, lazy, useCallback } from "react";
import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { BadgeFallback } from "@/three/BadgeFallback";
import { useDocumentVisible } from "./useDocumentVisible";
import { useInView } from "./useInView";
import { useSceneCapability } from "./useSceneCapability";

/**
 * The only import of the 3D tree in the whole app, and it is dynamic. Keeping
 * it here — behind both a capability check and an IntersectionObserver — keeps
 * three.js and drei out of the initial bundle.
 */
const HologramCanvas = lazy(() => import("@/three/HologramCanvas"));

/**
 * The centre stage. Renders one of:
 *  - <BadgeFallback> — no WebGL / unusable GPU, still off-screen, or the 3D
 *    chunk still downloading; or
 *  - the lazily-loaded hologram scene (a card on a projector pedestal). Under
 *    reduced motion or a low-end device the scene still renders — just static
 *    (`animated={false}`) — so it is never replaced by the flat 2D card.
 */
export function PassCard({ profile }: { profile: Profile }) {
  const { mode, animated, config, dpr, reason } = useSceneCapability();
  const documentVisible = useDocumentVisible();

  // `once` for the download decision: having paid for the chunk we keep it.
  const load = useInView({ rootMargin: "300px", once: true });
  // A second, live observer drives the frame-loop gate.
  const visible = useInView({ rootMargin: "0px" });

  const loadRef = load.ref;
  const visibleRef = visible.ref;
  const attachRefs = useCallback(
    (node: HTMLDivElement | null) => {
      loadRef(node);
      visibleRef(node);
    },
    [loadRef, visibleRef],
  );

  const isFallback = mode === "fallback" || config === null;

  return (
    // The stage: a token-driven background (deep navy bay at dusk, soft glows at
    // night) instead of the old fixed-height wrapper + local nebula + .holo-stage.
    <BentoCard
      area="pass"
      padded={false}
      grow
      className="bg-[image:var(--stage-bg)] shadow-[inset_0_0_0_1px_var(--stage-edge),inset_0_1px_0_0_var(--stage-edge)]"
    >
      {/* Fills the card (BentoCard is already `relative`) — NOT `h-full`: on mobile the
            card's height comes only from min-height, so a percentage height would
            collapse to 0 and leave the canvas nothing to fill. */}
      <div ref={attachRefs} className="absolute inset-0">
        {/* The scene fills the stage above a 34px band that holds the caption,
            so the hologram is centred in the space ABOVE it. */}
        <div className="absolute inset-x-0 top-0 bottom-[34px]">
          {isFallback ? (
            <BadgeFallback profile={profile} reason={reason ?? "no-webgl"} />
          ) : !load.inView ? (
            <BadgeFallback profile={profile} reason="offscreen" />
          ) : (
            <Suspense fallback={<BadgeFallback profile={profile} reason="loading" />}>
              <HologramCanvas
                profile={profile}
                config={config}
                animated={animated}
                dpr={dpr}
                active={visible.inView && documentVisible}
              />
            </Suspense>
          )}
        </div>

        {/* The static badge carries its own caption; only the canvas path adds
            one here, to avoid duplicating it in the a11y tree. */}
        {!isFallback && load.inView ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-[var(--stage-caption)] uppercase">
            {profile.badge.caption}
          </p>
        ) : null}
      </div>
    </BentoCard>
  );
}
