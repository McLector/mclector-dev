import { describe, expect, it } from "vitest";
import { MOTE_SPEED, coneRadius, makeMotes, stepMotes } from "./motes";

const Y0 = -1.8;
const H = 4;
/** A fixed, repeating "random" so the field is reproducible. */
const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("makeMotes", () => {
  it("makes three floats per mote", () => {
    expect(makeMotes(7, Y0, H, seq([0.2, 0.5, 0.9])).length).toBe(21);
  });

  it("keeps every mote inside the beam: between its base and top, within the cone's radius there", () => {
    const pos = makeMotes(200, Y0, H);
    for (let i = 0; i < 200; i++) {
      const [x, y, z] = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
      expect(y).toBeGreaterThanOrEqual(Y0);
      expect(y).toBeLessThanOrEqual(Y0 + H);
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(coneRadius((y - Y0) / H) + 1e-6);
    }
  });

  it("is deterministic for a given random source, and empty for zero motes", () => {
    expect(makeMotes(5, Y0, H, seq([0.3, 0.6, 0.1]))).toEqual(makeMotes(5, Y0, H, seq([0.3, 0.6, 0.1])));
    expect(makeMotes(0, Y0, H).length).toBe(0);
  });
});

describe("stepMotes", () => {
  it("drifts motes upward at a slow, steady speed and leaves x and z alone", () => {
    const pos = new Float32Array([0.3, 0, -0.2]);
    stepMotes(pos, 1, Y0, H);
    expect(pos[1]).toBeCloseTo(MOTE_SPEED, 5);
    expect(pos[0]).toBeCloseTo(0.3, 5);
    expect(pos[2]).toBeCloseTo(-0.2, 5);
  });

  it("wraps a mote that rises past the top back to the base, so the field never empties", () => {
    const pos = new Float32Array([0, Y0 + H - 0.01, 0]);
    stepMotes(pos, 1, Y0, H);
    expect(pos[1]).toBeGreaterThanOrEqual(Y0);
    expect(pos[1]).toBeLessThan(Y0 + 1);
  });

  it("does nothing for a zero time step", () => {
    const pos = new Float32Array([0.1, 0.4, 0.2]);
    stepMotes(pos, 0, Y0, H);
    expect(Array.from(pos)).toEqual([expect.closeTo(0.1, 5), expect.closeTo(0.4, 5), expect.closeTo(0.2, 5)]);
  });
});
