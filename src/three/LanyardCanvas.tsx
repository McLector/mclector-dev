import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import type { Profile } from "@/content/types";
import { TIER_CONFIG, type TierConfig } from "@/lib/capability";
import LanyardScene from "./LanyardScene";

export type LanyardCanvasProps = {
  profile: Profile;
  config?: TierConfig;
  dpr?: number;
  /**
   * False while the card is off-screen or the tab is hidden. Drives
   * `frameloop`, NOT `frameloop="demand"` — the physics solver needs
   * continuous stepping whenever it steps at all; the correct lever is
   * whether the loop runs, not whether a single frame is requested.
   */
  active?: boolean;
  onGpuTier?: (gpuTier: number) => void;
};

/**
 * The lazy boundary. Everything three.js — r3f, drei, Rapier's inlined WASM —
 * is reachable only through this module, so the bundler can put the whole lot
 * in a chunk the initial page never requests.
 */
export default function LanyardCanvas({
  profile,
  config = TIER_CONFIG.medium,
  dpr = 1.5,
  active = true,
  onGpuTier,
}: LanyardCanvasProps) {
  return (
    <div data-pass-variant="webgl" className="h-full w-full">
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={Math.min(dpr, config.maxDpr)}
        camera={{ position: [0, 0, 13], fov: 25 }}
        gl={{ antialias: config.antialias, powerPreference: "high-performance", alpha: true }}
      >
        <Suspense fallback={null}>
          <LanyardScene profile={profile} config={config} onGpuTier={onGpuTier} />
        </Suspense>
      </Canvas>
    </div>
  );
}
