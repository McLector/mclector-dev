import { DEP, PH, PW } from "./sceneDims";

/**
 * The hologram card's frame, as pure numbers. The card is two photo faces and four corner brackets: no bezel,
 * rim or glint (the owner's pick, "Corners only"). Kept out of HologramScene so it is unit-testable without WebGL.
 */

export type Point2 = { x: number; y: number };

/** Half the slab's depth: each face sits this far either side of the middle (z = 0). */
export const FZ = DEP * 0.5;

/**
 * z of each layer, for the FRONT face; the back face mirrors it (× −1).
 * The two screens are 0.03 apart, so back-face culling keeps each from showing through the other.
 */
export const FACE_Z = {
  /** The projected photo. */
  screen: FZ - 0.05,
  /** The corner brackets, in front of the photo and clear of it. */
  bracket: FZ + 0.03,
} as const;

/** The corner brackets: where they sit (just outside the picture), how long each leg is, and how bright. */
export const BRACKET = {
  halfW: (PW + 0.06) / 2,
  halfH: (PH + 0.06) / 2,
  length: 0.3,
  opacity: 0.9,
} as const;

/** The four brackets as three-point polylines: down the vertical edge, round the corner, along the horizontal edge. */
export function bracketCorners(): Point2[][] {
  const { halfW, halfH, length } = BRACKET;
  return (
    [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ] as const
  ).map(([sx, sy]) => [
    { x: sx * halfW, y: sy * halfH - sy * length },
    { x: sx * halfW, y: sy * halfH },
    { x: sx * halfW - sx * length, y: sy * halfH },
  ]);
}
