/**
 * Device-capability detection for the 3D lanyard scene. Pure decision logic
 * lives here and is unit-tested directly; the browser-signal gathering
 * (readCapabilitySignals) touches globals and is exercised indirectly via
 * the consuming hook/component, not here.
 */

import { getMotion } from "./motion";

export type QualityTier = "unsupported" | "low" | "medium" | "high";

export type CapabilitySignals = {
  hasWebGL: boolean;
  /** The visitor switched the Animations toggle off. The OS reduced-motion setting is deliberately NOT read (see motion.ts). */
  motionOff: boolean;
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
  /** The post-processing bloom pass — what makes the badge glow. Off on the
   *  weakest WebGL tier because it is the most expensive per-frame effect. */
  bloom: boolean;
  physicsSubsteps: number;
};

export const TIER_CONFIG: Record<Exclude<QualityTier, "unsupported">, TierConfig> = {
  low: { maxDpr: 1, antialias: false, starfield: false, bloom: false, physicsSubsteps: 1 },
  medium: { maxDpr: 1.5, antialias: true, starfield: true, bloom: true, physicsSubsteps: 1 },
  high: { maxDpr: 2, antialias: true, starfield: true, bloom: true, physicsSubsteps: 2 },
};

export function resolveQualityTier(signals: CapabilitySignals): QualityTier {
  if (!signals.hasWebGL) return "unsupported";
  if (signals.motionOff) return "unsupported";
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

  return {
    hasWebGL,
    // The Animations toggle, not the OS setting: ambient motion runs by default for every visitor.
    motionOff: getMotion() === "off",
    devicePixelRatio: window.devicePixelRatio || 1,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    // Real GPU tier is supplied by drei's useDetectGPU at the call site
    // (features/pass/**); default to "unknown-but-capable" so a signals
    // object built without it doesn't spuriously downgrade.
    gpuTier: 2,
  };
}

/**
 * The scene render decision, decoupled from motion. Unlike `resolveQualityTier`
 * (which folds "animations off" into "unsupported"), this renders the 3D object
 * for anyone with a working GPU — the Animations toggle being off (or a low-end device) only
 * downgrades it to `static` (rendered but no autonomous animation), never to
 * the flat 2D fallback. Only a missing WebGL context or an unusable GPU
 * (`gpuTier <= 0`) yields `fallback`.
 */
export type SceneMode = "full" | "static" | "fallback";

/** Hardware tier ignoring motion/webgl — used to pick the TierConfig. */
export function resolveHardwareTier(
  signals: CapabilitySignals,
): Exclude<QualityTier, "unsupported"> {
  const memory = signals.deviceMemory ?? 4;
  const cores = signals.hardwareConcurrency;
  if (cores <= 2 || memory <= 2) return "low";
  if (cores <= 4 || memory <= 4 || signals.gpuTier === 1) return "medium";
  return "high";
}

export function resolveSceneMode(signals: CapabilitySignals): SceneMode {
  if (!signals.hasWebGL) return "fallback";
  if (signals.gpuTier <= 0) return "fallback";
  if (signals.motionOff) return "static";
  if (resolveHardwareTier(signals) === "low") return "static";
  return "full";
}
