import { useCallback, useEffect, useState } from "react";
import {
  readCapabilitySignals,
  resolveQualityTier,
  TIER_CONFIG,
  type CapabilitySignals,
  type QualityTier,
  type TierConfig,
} from "@/lib/capability";

export type FallbackReason = "no-webgl" | "reduced-motion" | "low-tier";

export type SceneCapability = {
  tier: QualityTier;
  /** null exactly when `tier === "unsupported"`. */
  config: TierConfig | null;
  signals: CapabilitySignals;
  /** null when the 3D scene should render. */
  reason: FallbackReason | null;
  /** devicePixelRatio already clamped to the tier ceiling. */
  dpr: number;
};

/**
 * Why the static badge is being shown, given raw signals. Pure, so the
 * precedence (no WebGL beats reduced motion beats weak GPU) is pinned by a
 * test rather than by reading the branch order.
 */
export function fallbackReason(signals: CapabilitySignals): FallbackReason | null {
  if (!signals.hasWebGL) return "no-webgl";
  if (signals.prefersReducedMotion) return "reduced-motion";
  if (resolveQualityTier(signals) === "unsupported") return "low-tier";
  return null;
}

/**
 * Resolve the quality tier for the lanyard scene from browser signals.
 *
 * Deliberately does NOT import drei's `useDetectGPU`: this hook runs in the
 * *initial* bundle (PassCard decides whether to download the 3D chunk at all),
 * and drei would drag three.js in with it. `readCapabilitySignals` defaults
 * `gpuTier` to 2 — "unknown but presumed capable" — and the real GPU tier is
 * folded in later, inside the lazy chunk, by `src/three/useGpuRefinedTier.ts`.
 */
export function useSceneCapability(): SceneCapability {
  const resolve = useCallback((overrides?: Partial<CapabilitySignals>): SceneCapability => {
    const signals = { ...readCapabilitySignals(), ...overrides };
    const tier = resolveQualityTier(signals);
    const config = tier === "unsupported" ? null : TIER_CONFIG[tier];
    return {
      tier,
      config,
      signals,
      reason: fallbackReason(signals),
      dpr: Math.min(signals.devicePixelRatio, config?.maxDpr ?? 1),
    };
  }, []);

  const [capability, setCapability] = useState<SceneCapability>(() => resolve());

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => {
      setCapability(resolve({ prefersReducedMotion: event.matches }));
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [resolve]);

  return capability;
}
