import { HOLO_PALETTES, type HoloPalette } from "./palette";
import { PED_Y } from "./sceneDims";

/**
 * The projector under the card, as pure data: the HUD rings, the dotted floor, the dash ring round the emitter
 * and the shafts of light. These are the approved mock-up's (P4 "Reference, slow spin", compact base), kept
 * out of HologramScene so every count, bound and motion rule is unit-testable without WebGL. THREE draws what
 * these describe.
 */

/** The base radius the camera fit already allows for (`hologramFramePoints`). */
export const BASE_RADIUS = 1.9;

const TWO_PI = Math.PI * 2;

/** A small, seedable random source: the same seed always lays out the same projector. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive, finite number, got ${value}`);
  }
}

function requireCount(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a whole number of 0 or more, got ${value}`);
  }
}

// ---- rings ----

/** One flat arc on the floor. `group` says which ring set it turns with (see `projectorMotion`). */
export type ArcSpec = {
  group: "outer" | "inner";
  rIn: number;
  rOut: number;
  /** Radians, from the +x axis. */
  start: number;
  /** Radians swept; a full turn is a complete ring. */
  sweep: number;
  color: number;
  opacity: number;
};

const INNER_ARC_BLUE = 0x59c8ff;
const TICK_BLUE = 0x7fd6ff;
const HAIRLINE_BLUE = 0x8fdcff;

/**
 * The thin outer ring, three thick arcs, two inner arcs and two hairline rings, all scaled to base radius `R`.
 * The outer ring and thick arcs take `palette.hud`; the inner arcs and hairlines keep their pale blues in
 * every theme. Dark by default, so a caller that passes nothing gets what the site always drew.
 */
export function ringSpecs(R: number, palette: HoloPalette = HOLO_PALETTES.dark): ArcSpec[] {
  requirePositive("base radius", R);
  const hairline = (radius: number, opacity: number): ArcSpec => ({
    group: "inner",
    rIn: radius - 0.006,
    rOut: radius + 0.006,
    start: 0,
    sweep: TWO_PI,
    color: HAIRLINE_BLUE,
    opacity,
  });
  const thick = (start: number, sweep: number, opacity: number): ArcSpec => ({
    group: "outer",
    rIn: R * 0.955,
    rOut: R * 0.995,
    start,
    sweep,
    color: palette.hud,
    opacity,
  });
  const innerArc = (start: number, sweep: number): ArcSpec => ({
    group: "inner",
    rIn: R * 0.82,
    rOut: R * 0.845,
    start,
    sweep,
    color: INNER_ARC_BLUE,
    opacity: 0.85,
  });
  return [
    { group: "outer", rIn: R - 0.008, rOut: R + 0.008, start: 0, sweep: TWO_PI, color: palette.hud, opacity: 0.7 },
    thick(0.15, 1.15, 0.95),
    thick(3.5, 0.55, 0.95),
    thick(5.2, 0.85, 0.8),
    innerArc(2.6, 2.3),
    innerArc(5.6, 0.5),
    hairline(R * 0.64, 0.5),
    hairline(R * 0.5, 0.4),
  ];
}

// ---- tick marks ----

/** A run of short radial tick marks along an arc. */
export type TickSpec = {
  radius: number;
  count: number;
  start: number;
  sweep: number;
  /** Along the radius. */
  length: number;
  /** Across it. */
  width: number;
  color: number;
  opacity: number;
};

/** Where one laid part sits on the floor, and how it is turned. */
export type Placement = {
  x: number;
  z: number;
  /** Where it is round the axis, radians from +x. */
  angle: number;
  /** What to set the part's `rotation.y` to, so it lies along the radius. */
  rotationY: number;
};

export function tickSets(R: number): TickSpec[] {
  requirePositive("base radius", R);
  const base = { radius: R * 0.9, length: 0.075, width: 0.016, color: TICK_BLUE };
  return [
    { ...base, count: 56, start: 3.0, sweep: 2.6, opacity: 0.75 },
    { ...base, count: 26, start: 0.4, sweep: 1.1, opacity: 0.6 },
  ];
}

/** Each tick's place: evenly spaced from `start` across `sweep`, ends included; a lone tick sits at `start`. */
export function tickTransforms(set: TickSpec): Placement[] {
  requireCount("tick count", set.count);
  const out: Placement[] = [];
  for (let i = 0; i < set.count; i++) {
    const a = set.start + (set.count === 1 ? 0 : (i / (set.count - 1)) * set.sweep);
    out.push({ x: Math.cos(a) * set.radius, z: -Math.sin(a) * set.radius, angle: a, rotationY: a });
  }
  return out;
}

// ---- the emitter's dash ring ----

export const DASH_RING = { count: 14, radius: 0.72, length: 0.13, width: 0.05, opacity: 0.85 } as const;

/** The rectangular dashes round the emitter, evenly spaced. */
export function dashRing(count: number = DASH_RING.count): Placement[] {
  requireCount("dash count", count);
  const out: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TWO_PI;
    out.push({ x: Math.cos(a) * DASH_RING.radius, z: Math.sin(a) * DASH_RING.radius, angle: a, rotationY: -a });
  }
  return out;
}

// ---- dotted floor ----

/**
 * A polar scatter of dots on the floor that fades out with distance, as flat arrays ready for a THREE
 * buffer. Positions are (x, 0, z): the scene sets the height. The scene draws it additively, so a darker
 * colour is a fainter dot, which is how it fades. `brightness` scales every dot.
 */
export function dotFloor(R: number, brightness = 1): { positions: Float32Array; colors: Float32Array } {
  requirePositive("base radius", R);
  if (!Number.isFinite(brightness) || brightness < 0) {
    throw new RangeError(`brightness must be 0 or more, got ${brightness}`);
  }
  const rnd = mulberry32(7);
  const positions: number[] = [];
  const colors: number[] = [];
  for (let ring = 1; ring <= 9; ring++) {
    const r = R * (0.28 + ring * 0.115);
    const n = 14 + ring * 7;
    const fade = Math.pow(Math.max(0, 1 - r / (R * 1.4)), 1.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TWO_PI + ring * 0.2;
      positions.push(Math.cos(a) * r, 0, Math.sin(a) * r);
      const b = Math.min(1, fade * (0.55 + rnd() * 0.45) * brightness);
      colors.push(0.18 * b, 0.62 * b, b);
    }
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
}

// ---- shafts of light ----

/** One shaft of light: a thin vertical plane with its own width, brightness, lean and flicker. */
export type ShaftSpec = {
  x: number;
  z: number;
  width: number;
  /** In (0, 1]. */
  opacity: number;
  /** Where in its flicker it starts, radians. */
  phase: number;
  /** Flicker rate, radians per second. */
  speed: number;
  /** `rotation.z`: leans away from the axis in proportion to the offset, so the shafts fan out. */
  lean: number;
  /** Teal (most) or blue. */
  teal: boolean;
};

/** The approved shafts: how many, which layout, how far apart at the emitter, and how tall. */
export const SHAFT = { count: 22, seed: 11, spread: 0.58, height: 3.9 } as const;

/** Just above the floor plane, where every shaft starts. */
export const SHAFT_BASE_Y = PED_Y + 0.14;

export function shaftSpecs(
  count: number,
  seed: number,
  spread: number,
  { k = 1, widthMin = 0.06, widthMax = 0.36 }: { k?: number; widthMin?: number; widthMax?: number } = {},
): ShaftSpec[] {
  requireCount("shaft count", count);
  if (!Number.isFinite(spread) || spread < 0) throw new RangeError(`spread must be 0 or more, got ${spread}`);
  requirePositive("brightness", k);
  requirePositive("minimum width", widthMin);
  if (!Number.isFinite(widthMax) || widthMax < widthMin) {
    throw new RangeError(`maximum width must be at least the minimum, got ${widthMax}`);
  }
  const rnd = mulberry32(seed);
  const out: ShaftSpec[] = [];
  for (let i = 0; i < count; i++) {
    // The order of these draws is the approved layout's. Reordering them changes every shaft.
    const width = widthMin + Math.pow(rnd(), 1.6) * (widthMax - widthMin);
    const teal = rnd() < 0.7;
    const opacity = Math.min(1, (0.3 + rnd() * 0.6) * k);
    const phase = rnd() * 6.28;
    const speed = 0.6 + rnd() * 1.4;
    const x = (rnd() * 2 - 1) * spread;
    const z = (rnd() * 2 - 1) * 0.25;
    out.push({ x, z, width, opacity, phase, speed, lean: -x * 0.3, teal });
  }
  return out;
}

// ---- motion ----

/**
 * How far each moving ring set has turned at time `t`: the outer arcs one way, the inner ring the other, the
 * dash ring a little faster. Exactly still when not animated, whatever the clock says.
 */
export function projectorMotion(t: number, animated: boolean): { outer: number; inner: number; dash: number } {
  if (!animated) return { outer: 0, inner: 0, dash: 0 };
  return { outer: t * 0.12, inner: 0 - t * 0.2, dash: t * 0.25 };
}
