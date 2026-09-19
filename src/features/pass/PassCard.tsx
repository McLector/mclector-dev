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
    <BentoCard area="pass" padded={false} grow>
      <div ref={attachRefs} className="relative flex h-full w-full flex-col justify-center gap-2 py-3">
        {/* Local nebula glow behind the hologram, layered over the galaxy. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[clamp(360px,58vh,640px)] -translate-y-1/2"
          style={{
            backgroundImage:
              "radial-gradient(42% 38% at 50% 42%, rgba(94,200,255,0.28) 0%, transparent 70%), radial-gradient(38% 34% at 56% 60%, rgba(140,90,255,0.2) 0%, transparent 72%)",
          }}
        />

        <div className="relative h-[clamp(340px,58vh,600px)] w-full">
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
          <p className="relative z-10 text-center font-[family-name:var(--font-mono)] text-[0.625rem] tracking-[0.18em] text-[var(--color-text-muted)] uppercase">
            {profile.badge.caption}
          </p>
        ) : null}
      </div>
    </BentoCard>
  );
}
