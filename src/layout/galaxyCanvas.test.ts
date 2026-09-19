import { describe, expect, it } from "vitest";
import { makeAsteroids, makeRainColumns } from "./galaxyCanvas";

const half = () => 0.5; // deterministic rng

describe("makeAsteroids", () => {
  it("makes exactly n asteroids within bounds", () => {
    const rocks = makeAsteroids(11, 1440, 900, half);
    expect(rocks).toHaveLength(11);
    for (const r of rocks) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x).toBeLessThanOrEqual(1440);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeLessThanOrEqual(900);
      expect(r.verts.length).toBeGreaterThanOrEqual(6);
      expect(typeof r.vx).toBe("number");
      expect(typeof r.vy).toBe("number");
    }
  });

  it("is deterministic given a fixed rng", () => {
    expect(makeAsteroids(3, 800, 600, half)).toEqual(makeAsteroids(3, 800, 600, half));
  });
});

describe("makeRainColumns", () => {
  it("makes ceil(width/colW) columns, each a binary string of the given length", () => {
    const cols = makeRainColumns(1440, 22, 60, half);
    expect(cols).toHaveLength(Math.ceil(1440 / 22));
    for (const c of cols) {
      expect(c.str).toHaveLength(60);
      expect(c.str).toMatch(/^[01]+$/);
      expect(typeof c.sp).toBe("number");
    }
  });
});
