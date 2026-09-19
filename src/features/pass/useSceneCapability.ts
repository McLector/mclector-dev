import { useCallback, useEffect, useState } from "react";
import {
  readCapabilitySignals,
  resolveHardwareTier,
  resolveSceneMode,
  TIER_CONFIG,
  type CapabilitySignals,
  type SceneMode,
  type TierConfig,
} from "@/lib/capability";

/** Why the 2D fallback is shown, when it is. */
export type FallbackReason = "no-webgl" | "low-tier" | "loading" | "offscreen";

export type SceneCapability = {
  /** full = animated 3D; static = 3D but no autonomous motion; fallback = 2D. */
  mode: SceneMode;
  /** null exactly when `mode === "fallback"`. */
  config: TierConfig | null;
  /** true only in `full` mode — drives whether the scene animates itself. */
  animated: boolean;
  signals: CapabilitySignals;
  /** the fallback reason when `mode === "fallback"`, else null. */
  reason: FallbackReason | null;
  /** devicePixelRatio already clamped to the tier ceiling. */
  dpr: number;
};

/**
 * The fallback reason for a set of signals — only a genuine inability to render
 * (no WebGL, or an unusable GPU). Reduced motion is NOT a fallback: it renders
 * the 3D object statically. Pure so the precedence is pinned by a test.
 */
export function fallbackReason(signals: CapabilitySignals): FallbackReason | null {
  if (!signals.hasWebGL) return "no-webgl";
  if (signals.gpuTier <= 0) return "low-tier";
  return null;
}

/**
 * Resolve how the pass centre should render from browser signals.
 *
 * Deliberately does NOT import drei's `useDetectGPU`: this hook runs in the
 * *initial* bundle (PassCard decides whether to download the 3D chunk at all),
 * and drei would drag three.js in with it. `readCapabilitySignals` defaults
 * `gpuTier` to 2 — "unknown but presumed capable" — and the real GPU tier is
 * folded in later, inside the lazy chunk, by the scene's GPU gate.
 */
export function useSceneCapability(): SceneCapability {
  const resolve = useCallback((overrides?: Partial<CapabilitySignals>): SceneCapability => {
    const signals = { ...readCapabilitySignals(), ...overrides };
    const mode = resolveSceneMode(signals);
    const config = mode === "fallback" ? null : TIER_CONFIG[resolveHardwareTier(signals)];
    return {
      mode,
      config,
      animated: mode === "full",
      signals,
      reason: mode === "fallback" ? fallbackReason(signals) : null,
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
