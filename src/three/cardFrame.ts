import { DEP } from "./sceneDims";

/**
 * The hologram card's frame, as pure numbers: the z-stack of the two-sided slab and the
 * animated rim and glint. Values are the approved round-2 mockup's
 * (docs/reference/2026-09-20-revamp-round-2-mockup.html). Kept out of HologramScene so they
 * are unit-testable without WebGL.
 */

export type Point2 = { x: number; y: number };

/** Half the slab's depth: each face sits this far either side of the middle (z = 0). */
export const FZ = DEP * 0.5;

/** The bezel's `bevelThickness`, which adds to its half-depth on each side. */
const BEZEL_BEVEL = 0.03;
/** How far the bezel's front face is from the middle. */
export const BEZEL_HALF_THICKNESS = DEP / 2 + BEZEL_BEVEL;

/**
 * z of each layer, for the FRONT face; the back face mirrors it (× −1).
 *
 * Every solid layer stays inside the bezel (≤ BEZEL_HALF_THICKNESS), so the camera fit —
 * which ignores the card's thickness — is unaffected. The glint is the one exception, on
 * purpose: it must sit just in FRONT of the bezel face or the depth test would hide it.
 */
export const FACE_Z = {
  /** The smoked-glass body, shared by both faces, in the middle. */
  backing: 0,
  /** The projected photo. The two screens are 0.03 apart. */
  screen: FZ - 0.05,
  /** The glass sheen over the photo. */
  sheen: FZ + 0.012,
  /** Both rim strokes. */
  rim: FZ + 0.02,
  /** The corner brackets. */
  bracket: FZ + 0.03,
  /** The travelling glint. */
  glint: FZ + 0.04,
} as const;

/** Opacities of the animated frame parts. Static (reduced motion / low tier) when `animated` is false. */
export function frameOpacities(t: number, animated: boolean) {
  return {
    rimInner: animated ? 0.7 + 0.25 * Math.sin(t * 2.2) : 0.85,
    rimOuter: 0.42 * (animated ? 0.8 + 0.2 * Math.sin(t * 2.2 + 1) : 1),
    bracketOuter: 0.5,
  };
}

/** The clock the glint is frozen at when not animating, so a static frame still shows it. */
export const GLINT_STATIC_T = 4.2;
/** Sprites per face: one bright head and a short trail behind it. */
export const GLINT_TRAIL = 6;
/** Fraction of the rim covered per second. */
const GLINT_SPEED = 0.085;
/** How far each trail sprite lags the one before it, as a fraction of the rim. */
const GLINT_LAG = 0.007;

/** Where sprite `k` (0 = head) is on the rim, as a fraction in [0, 1). */
export function glintProgress(t: number, k: number, animated: boolean): number {
  const clock = animated ? t : GLINT_STATIC_T;
  // Double modulo: a trail sprite whose lag crosses the start of the rim must wrap, not go negative.
  return (((clock * GLINT_SPEED - k * GLINT_LAG) % 1) + 1) % 1;
}

/** The rim-path point sprite `k` is on. */
export function glintPoint(
  path: ReadonlyArray<Point2>,
  t: number,
  k: number,
  animated: boolean,
): Point2 {
  return path[Math.floor(glintProgress(t, k, animated) * (path.length - 1))];
}

export function glintScale(k: number): number {
  return k === 0 ? 0.15 : 0.11 - k * 0.014;
}

export function glintOpacity(k: number): number {
  return k === 0 ? 0.9 : 0.5 * (1 - k / GLINT_TRAIL);
}
