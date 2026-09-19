import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import type { Profile } from "@/content/types";
import { TIER_CONFIG, type TierConfig } from "@/lib/capability";
import HologramScene from "./HologramScene";

export type HologramCanvasProps = {
  profile: Profile;
  config?: TierConfig;
  /** false → the scene renders but does not animate itself (reduced motion). */
  animated?: boolean;
  dpr?: number;
  /** false while off-screen or the tab is hidden — pauses the frame loop. */
  active?: boolean;
};

/**
 * The lazy boundary for the hologram scene. Everything three.js — r3f, drei —
 * is reachable only through this module, so the bundler keeps it out of the
 * initial page bundle.
 */
export default function HologramCanvas({
  profile,
  config = TIER_CONFIG.medium,
  animated = true,
  dpr = 1.5,
  active = true,
}: HologramCanvasProps) {
  return (
    <div data-pass-variant="webgl" className="h-full w-full">
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={Math.min(dpr, config.maxDpr)}
        camera={{ position: [0, 0.3, 7.6], fov: 32 }}
        gl={{ antialias: config.antialias, powerPreference: "high-performance", alpha: true }}
      >
        <Suspense fallback={null}>
          <HologramScene profile={profile} config={config} animated={animated} />
        </Suspense>
      </Canvas>
    </div>
  );
}
