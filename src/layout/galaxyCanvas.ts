/**
 * Pure factories for the alive-galaxy canvas field (drifting asteroids +
 * binary data-rain). Kept side-effect-free and seedable so they can be
 * unit-tested; `GalaxyBackdrop` owns the actual draw loop that mutates and
 * renders them.
 */

export type Asteroid = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  verts: Array<[number, number]>;
  depth: number;
};

export type RainColumn = { y: number; sp: number; str: string };

type Rng = () => number;

export function makeAsteroids(n: number, w: number, h: number, rng: Rng = Math.random): Asteroid[] {
  const rocks: Asteroid[] = [];
  for (let i = 0; i < n; i++) {
    const depth = 0.45 + rng() * 1.25;
    const sides = 6 + Math.floor(rng() * 3);
    const rad = (3 + rng() * 7) * depth;
    const verts: Array<[number, number]> = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const rr = rad * (0.68 + rng() * 0.5);
      verts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    rocks.push({
      x: rng() * w,
      y: rng() * h,
      vx: (-0.08 - rng() * 0.22) * depth,
      vy: (-0.03 + rng() * 0.06) * depth,
      rot: rng() * 6,
      vr: (rng() - 0.5) * 0.004,
      verts,
      depth,
    });
  }
  return rocks;
}

export function makeRainColumns(width: number, colW: number, len: number, rng: Rng = Math.random): RainColumn[] {
  const n = Math.ceil(width / colW);
  const cols: RainColumn[] = [];
  for (let i = 0; i < n; i++) {
    let str = "";
    for (let k = 0; k < len; k++) str += rng() > 0.5 ? "0" : "1";
    cols.push({ y: rng() * 800, sp: 0.35 + rng() * 0.9, str });
  }
  return cols;
}
