import { ringPoints, type Point3 } from "./math/fitCamera";

/**
 * Shared dimensions of the hologram scene, in world units. Pulled out of
 * HologramScene so the camera framing (and its test) can reason about the same
 * numbers the scene is built from.
 */

/** Card (the projected portrait screen). */
export const PW = 1.95;
export const PH = 2.45;
export const DEP = 0.13;
/** Resting height of the card's centre, and how far it bobs each way. */
export const CARD_Y = 0.55;
export const BOB = 0.05;

/** Height of the pedestal group's origin. */
export const PED_Y = -1.9;

/** Vertical field of view, degrees. */
export const FOV = 32;
/** Breathing room kept around the framed object, as a fraction of the frame. */
export const FRAME_MARGIN = 0.06;

/**
 * The points that must stay on screen: the pedestal's rim (top and bottom of the
 * plate) and the card at both ends of its float. The beam is deliberately NOT in
 * here — it is allowed to bleed past the frame and fades out on its own.
 */
export function hologramFramePoints(): Point3[] {
  // Bezel half-height: (PH + 0.17) / 2, plus the 0.03 bevel.
  const cardHalf = (PH + 0.17) / 2 + 0.03;
  return [
    ...ringPoints(1.9, PED_Y - 0.06),
    ...ringPoints(1.9, PED_Y + 0.12),
    ...ringPoints(1.1, CARD_Y + BOB + cardHalf),
    ...ringPoints(1.1, CARD_Y - BOB - cardHalf),
  ];
}
