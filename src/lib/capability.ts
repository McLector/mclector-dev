/**
 * Device-capability detection for the 3D lanyard scene. Pure decision logic
 * lives here and is unit-tested directly; the browser-signal gathering
 * (readCapabilitySignals) touches globals and is exercised indirectly via
 * the consuming hook/component, not here.
 */

export type QualityTier = "unsupported" | "low" | "medium" | "high";

export type CapabilitySignals = {
  hasWebGL: boolean;
  prefersReducedMotion: boolean;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  /** navigator.deviceMemory is non-standard and often undefined (e.g. Safari, Firefox). */
  deviceMemory: number | undefined;
  /** From drei's useDetectGPU: 0 = unsupported/very low, 1 = low-mid, 2+ = capable. */
  gpuTier: number;
};

export type TierConfig = {
  maxDpr: number;
  antialias: boolean;
  starfield: boolean;
  physicsSubsteps: number;
};

export const TIER_CONFIG: Record<Exclude<QualityTier, "unsupported">, TierConfig> = {
  low: { maxDpr: 1, antialias: false, starfield: false, physicsSubsteps: 1 },
  medium: { maxDpr: 1.5, antialias: true, starfield: true, physicsSubsteps: 1 },
  high: { maxDpr: 2, antialias: true, starfield: true, physicsSubsteps: 2 },
};

export function resolveQualityTier(signals: CapabilitySignals): QualityTier {
  if (!signals.hasWebGL) return "unsupported";
  if (signals.prefersReducedMotion) return "unsupported";
  if (signals.gpuTier <= 0) return "unsupported";

  const memory = signals.deviceMemory ?? 4; // unknown → assume modest, not generous
  const cores = signals.hardwareConcurrency;

  if (cores <= 2 || memory <= 2) return "low";
  if (cores <= 4 || memory <= 4 || signals.gpuTier === 1) return "medium";
  return "high";
}

export function readCapabilitySignals(): CapabilitySignals {
  const hasWebGL = (() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
      );
    } catch {
      return false;
    }
  })();

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    hasWebGL,
    prefersReducedMotion,
    devicePixelRatio: window.devicePixelRatio || 1,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    // Real GPU tier is supplied by drei's useDetectGPU at the call site
    // (features/pass/**); default to "unknown-but-capable" so a signals
    // object built without it doesn't spuriously downgrade.
    gpuTier: 2,
  };
}
