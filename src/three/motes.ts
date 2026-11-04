/**
 * Dust motes drifting up through the projector beam. They are what make the light read as light in
 * air rather than a painted cone. Pure and seedable, like the other scene helpers; `HologramScene`
 * owns the Points object and calls `stepMotes` each frame.
 */

/** World units per second: slow enough to be felt rather than watched. */
export const MOTE_SPEED = 0.14;

/** Radius of the glow at a height fraction `v` (0 = emitter, 1 = top), a little inside the beam's edge. */
export function coneRadius(v: number): number {
  return 0.6 + v * 1.5;
}

/** `n` motes as flat x,y,z triples, scattered through the beam's volume between `y0` and `y0 + h`. */
export function makeMotes(n: number, y0: number, h: number, rng: () => number = Math.random): Float32Array {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = rng();
    const angle = rng() * Math.PI * 2;
    const r = coneRadius(v) * Math.sqrt(rng());
    pos[i * 3] = Math.cos(angle) * r;
    pos[i * 3 + 1] = y0 + v * h;
    pos[i * 3 + 2] = Math.sin(angle) * r;
  }
  return pos;
}

/** Raise every mote by `dt` seconds of drift, wrapping any that pass the top back to the emitter. */
export function stepMotes(pos: Float32Array, dt: number, y0: number, h: number): void {
  for (let i = 1; i < pos.length; i += 3) {
    let y = pos[i] + MOTE_SPEED * dt;
    if (y > y0 + h) y -= h;
    pos[i] = y;
  }
}
