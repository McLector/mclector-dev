import { describe, expect, it } from "vitest";
import {
  DASH_RING,
  SHAFT,
  SHAFT_BASE_Y,
  dashRing,
  dotFloor,
  mulberry32,
  projectorMotion,
  ringSpecs,
  shaftSpecs,
  tickSets,
  tickTransforms,
} from "./projector";
import { PED_Y } from "./sceneDims";
import { holoPalette } from "./palette";

/**
 * The projector under the card, as pure data: the HUD rings, the dotted floor and the shafts of light.
 * The values are the approved mock-up's (P4 "Reference, slow spin", compact base), so the scene is
 * built from these and nothing else. THREE draws them; these tests pin what is drawn.
 */

describe("mulberry32", () => {
  it("is deterministic for a seed and stays in [0, 1)", () => {
    const a = mulberry32(11);
    const b = mulberry32(11);
    for (let i = 0; i < 200; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("gives a different stream for a different seed", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("ringSpecs", () => {
  const R = 1.9;
  const specs = ringSpecs(R);

  it("has four outer pieces (the thin full ring and three thick arcs) and four inner pieces", () => {
    expect(specs.filter((s) => s.group === "outer")).toHaveLength(4);
    expect(specs.filter((s) => s.group === "inner")).toHaveLength(4);
  });

  it("starts with the thin outer ring: a full circle exactly at the base radius", () => {
    const ring = specs[0];
    expect(ring.group).toBe("outer");
    expect(ring.sweep).toBeCloseTo(Math.PI * 2, 9);
    expect((ring.rIn + ring.rOut) / 2).toBeCloseTo(R, 9);
  });

  it("never reaches beyond the base radius, so the camera fit (radius 1.9) holds", () => {
    for (const s of specs) expect(s.rOut).toBeLessThanOrEqual(R + 0.01 + 1e-9);
  });

  it("is well formed: inner radius under outer, a positive sweep of at most a full turn, opacity in (0, 1]", () => {
    for (const s of specs) {
      expect(s.rIn).toBeGreaterThan(0);
      expect(s.rIn).toBeLessThan(s.rOut);
      expect(s.sweep).toBeGreaterThan(0);
      expect(s.sweep).toBeLessThanOrEqual(Math.PI * 2 + 1e-9);
      expect(s.opacity).toBeGreaterThan(0);
      expect(s.opacity).toBeLessThanOrEqual(1);
    }
  });

  it("scales every radius with the base, keeping the proportions", () => {
    const big = ringSpecs(2 * R);
    specs.forEach((s, i) => {
      if (s.sweep > Math.PI * 2 - 1e-9) return; // the full-circle hairlines keep a fixed width
      expect(big[i].rIn / s.rIn).toBeCloseTo(2, 5);
      expect(big[i].rOut / s.rOut).toBeCloseTo(2, 5);
      expect(big[i].sweep).toBeCloseTo(s.sweep, 9);
    });
  });

  it.each([0, -1, Number.NaN, Infinity])("rejects a base radius of %s", (r) => {
    expect(() => ringSpecs(r)).toThrow(RangeError);
  });
});

describe("tickSets and tickTransforms", () => {
  const sets = tickSets(1.9);

  it("has two runs of tick marks, 56 and 26, on the same radius", () => {
    expect(sets.map((s) => s.count)).toEqual([56, 26]);
    expect(sets[0].radius).toBeCloseTo(sets[1].radius, 9);
  });

  it("places every tick on its radius, from the start angle across the sweep", () => {
    for (const set of sets) {
      const ticks = tickTransforms(set);
      expect(ticks).toHaveLength(set.count);
      for (const t of ticks) expect(Math.hypot(t.x, t.z)).toBeCloseTo(set.radius, 9);
      expect(ticks[0].angle).toBeCloseTo(set.start, 9);
      expect(ticks[ticks.length - 1].angle).toBeCloseTo(set.start + set.sweep, 9);
    }
  });

  it("is evenly spaced", () => {
    const ticks = tickTransforms(sets[0]);
    const step = ticks[1].angle - ticks[0].angle;
    for (let i = 2; i < ticks.length; i++) expect(ticks[i].angle - ticks[i - 1].angle).toBeCloseTo(step, 9);
  });

  it("puts a single tick at the start angle, and none for a count of zero", () => {
    const one = tickTransforms({ ...sets[0], count: 1 });
    expect(one).toHaveLength(1);
    expect(one[0].angle).toBeCloseTo(sets[0].start, 9);
    expect(tickTransforms({ ...sets[0], count: 0 })).toEqual([]);
  });

  it.each([-1, 1.5, Number.NaN])("rejects a count of %s", (count) => {
    expect(() => tickTransforms({ ...sets[0], count })).toThrow(RangeError);
  });
});

describe("dashRing (the segments around the emitter)", () => {
  it("has 14 dashes by default, evenly spaced on the dash radius", () => {
    const d = dashRing();
    expect(d).toHaveLength(DASH_RING.count);
    expect(DASH_RING.count).toBe(14);
    for (const t of d) expect(Math.hypot(t.x, t.z)).toBeCloseTo(DASH_RING.radius, 9);
    expect(d[1].angle - d[0].angle).toBeCloseTo((Math.PI * 2) / 14, 9);
  });

  it("is empty for zero dashes and rejects a negative or fractional count", () => {
    expect(dashRing(0)).toEqual([]);
    expect(() => dashRing(-3)).toThrow(RangeError);
    expect(() => dashRing(2.5)).toThrow(RangeError);
  });
});

describe("dotFloor", () => {
  const R = 1.9;

  it("is a polar scatter of 441 dots: nine rings of 14 + 7n", () => {
    const { positions, colors } = dotFloor(R);
    expect(positions.length).toBe(441 * 3);
    expect(colors.length).toBe(441 * 3);
  });

  it("keeps every dot inside the faded disc (1.4 base radii) and on the floor plane", () => {
    const { positions } = dotFloor(R);
    for (let i = 0; i < positions.length; i += 3) {
      expect(Math.hypot(positions[i], positions[i + 2])).toBeLessThanOrEqual(R * 1.4);
      expect(positions[i + 1]).toBe(0);
    }
  });

  it("fades with distance: the outer rings are dimmer than the inner ones (additive, so dark = faint)", () => {
    const { positions, colors } = dotFloor(R);
    let inner = 0;
    let outer = 0;
    let ni = 0;
    let no = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const r = Math.hypot(positions[i], positions[i + 2]);
      if (r < R * 0.6) {
        inner += colors[i + 2];
        ni++;
      }
      if (r > R * 1.1) {
        outer += colors[i + 2];
        no++;
      }
    }
    expect(ni).toBeGreaterThan(0);
    expect(no).toBeGreaterThan(0);
    expect(outer / no).toBeLessThan(inner / ni);
  });

  it("keeps every colour channel in [0, 1], whatever the brightness", () => {
    for (const k of [0, 0.5, 1]) for (const c of dotFloor(R, k).colors) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic, and fully dark at brightness 0", () => {
    expect(Array.from(dotFloor(R).colors)).toEqual(Array.from(dotFloor(R).colors));
    expect(dotFloor(R, 0).colors.every((c) => c === 0)).toBe(true);
  });

  it.each([0, -2, Number.NaN])("rejects a base radius of %s", (r) => {
    expect(() => dotFloor(r)).toThrow(RangeError);
  });
  it("rejects a negative brightness", () => {
    expect(() => dotFloor(R, -0.1)).toThrow(RangeError);
  });
});

describe("shaftSpecs (the teal shafts of light)", () => {
  const specs = shaftSpecs(SHAFT.count, SHAFT.seed, SHAFT.spread);

  it("makes the approved 22 shafts", () => {
    expect(SHAFT.count).toBe(22);
    expect(specs).toHaveLength(22);
  });

  it("is deterministic for a seed, and different for another", () => {
    expect(shaftSpecs(22, 11, 0.58)).toEqual(specs);
    expect(shaftSpecs(22, 12, 0.58)).not.toEqual(specs);
  });

  it("keeps each shaft inside the emitter's spread, with a thin depth jitter", () => {
    for (const s of specs) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(SHAFT.spread);
      expect(Math.abs(s.z)).toBeLessThanOrEqual(0.25);
    }
  });

  it("varies widths within the range, and keeps opacity in (0, 1]", () => {
    for (const s of specs) {
      expect(s.width).toBeGreaterThanOrEqual(0.06);
      expect(s.width).toBeLessThanOrEqual(0.36);
      expect(s.opacity).toBeGreaterThan(0);
      expect(s.opacity).toBeLessThanOrEqual(1);
    }
    expect(new Set(specs.map((s) => s.width)).size).toBeGreaterThan(10);
  });

  it("leans each shaft outward from the axis, in proportion to its offset", () => {
    for (const s of specs) expect(s.lean).toBeCloseTo(-s.x * 0.3, 9);
  });

  it("is mostly teal with some blue, and each shaft has its own flicker phase and speed", () => {
    const many = shaftSpecs(400, 5, 0.58);
    const teal = many.filter((s) => s.teal).length / many.length;
    expect(teal).toBeGreaterThan(0.6);
    expect(teal).toBeLessThan(0.8);
    for (const s of many) {
      expect(s.speed).toBeGreaterThanOrEqual(0.6);
      expect(s.speed).toBeLessThanOrEqual(2.0);
      expect(s.phase).toBeGreaterThanOrEqual(0);
      expect(s.phase).toBeLessThanOrEqual(Math.PI * 2 + 0.01);
    }
  });

  it("scales brightness with k and still caps it at 1", () => {
    const quiet = shaftSpecs(22, 11, 0.58, { k: 0.5 });
    quiet.forEach((s, i) => expect(s.opacity).toBeLessThanOrEqual(specs[i].opacity + 1e-9));
    for (const s of shaftSpecs(50, 3, 0.58, { k: 10 })) expect(s.opacity).toBeLessThanOrEqual(1);
  });

  it("is empty for zero shafts", () => {
    expect(shaftSpecs(0, 11, 0.58)).toEqual([]);
  });

  it.each([-1, 2.5, Number.NaN])("rejects a shaft count of %s", (n) => {
    expect(() => shaftSpecs(n, 11, 0.58)).toThrow(RangeError);
  });
  it("rejects a negative spread and a reversed width range", () => {
    expect(() => shaftSpecs(5, 1, -0.1)).toThrow(RangeError);
    expect(() => shaftSpecs(5, 1, 0.5, { widthMin: 0.4, widthMax: 0.1 })).toThrow(RangeError);
    expect(() => shaftSpecs(5, 1, 0.5, { widthMin: 0 })).toThrow(RangeError);
  });
});

describe("where the shafts start", () => {
  it("rises just above the floor plane of the pedestal", () => {
    expect(SHAFT_BASE_Y).toBeCloseTo(PED_Y + 0.14, 9);
  });
});

describe("projectorMotion", () => {
  it("turns the outer arcs, the inner ring (the other way) and the dash ring at their own slow rates", () => {
    const m = projectorMotion(10, true);
    expect(m.outer).toBeCloseTo(1.2, 9);
    expect(m.inner).toBeCloseTo(-2, 9);
    expect(m.dash).toBeCloseTo(2.5, 9);
  });

  it("is exactly still when not animated, whatever the clock says", () => {
    for (const t of [0, 1.7, 99, 1e6]) expect(projectorMotion(t, false)).toEqual({ outer: 0, inner: 0, dash: 0 });
  });

  it("starts exactly at zero (not minus zero) when animated at t = 0", () => {
    const m = projectorMotion(0, true);
    for (const v of Object.values(m)) expect(Object.is(v, 0)).toBe(true);
  });
});

describe("ringSpecs with a palette", () => {
  const R = 1.9;
  const dark = holoPalette("dark");
  const light = holoPalette("light");
  const outerPieces = (specs: ReturnType<typeof ringSpecs>) => specs.filter((s) => s.group === "outer");
  const innerPieces = (specs: ReturnType<typeof ringSpecs>) => specs.filter((s) => s.group === "inner");

  it("draws exactly what it always has when no palette is given, and for the dark palette", () => {
    expect(ringSpecs(R, dark)).toEqual(ringSpecs(R));
    for (const s of outerPieces(ringSpecs(R))) expect(s.color).toBe(0x38b6ff);
  });

  it("colours the outer ring and the thick arcs with the light palette's ink", () => {
    for (const s of outerPieces(ringSpecs(R, light))) expect(s.color).toBe(light.hud);
  });

  it("leaves the inner arcs and hairlines in their pale blues, as approved (only the outer set changes)", () => {
    const colours = innerPieces(ringSpecs(R, light)).map((s) => s.color);
    expect(colours).toEqual(innerPieces(ringSpecs(R)).map((s) => s.color));
  });

  it("changes only colours: radii, sweeps and opacities are identical between themes", () => {
    const strip = (specs: ReturnType<typeof ringSpecs>) => specs.map(({ color: _color, ...rest }) => rest);
    expect(strip(ringSpecs(R, light))).toEqual(strip(ringSpecs(R, dark)));
  });
});
