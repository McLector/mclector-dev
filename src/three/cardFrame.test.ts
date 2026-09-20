import { describe, expect, it } from "vitest";
import { DEP } from "./sceneDims";
import {
  BEZEL_HALF_THICKNESS,
  FACE_Z,
  FZ,
  GLINT_STATIC_T,
  GLINT_TRAIL,
  frameOpacities,
  glintOpacity,
  glintPoint,
  glintProgress,
  glintScale,
} from "./cardFrame";

/**
 * Pins the approved round-2 mockup's card frame: the z-stack of the two-sided card and the
 * animated rim / glint. Values are the mockup's (docs/reference/2026-09-20-revamp-round-2-mockup.html).
 */

describe("face z-stack (two-sided card)", () => {
  it("FZ is half the slab depth", () => {
    expect(FZ).toBeCloseTo(DEP / 2, 10);
  });

  it("keeps every solid layer inside the bezel, so the camera fit (which ignores thickness) is unaffected", () => {
    for (const [name, z] of Object.entries(FACE_Z)) {
      if (name === "glint") continue;
      expect(Math.abs(z), name).toBeLessThanOrEqual(BEZEL_HALF_THICKNESS + 1e-9);
    }
  });

  it("puts the glint just IN FRONT of the bezel face — inside it, the depth test would hide it", () => {
    expect(FACE_Z.glint).toBeGreaterThan(BEZEL_HALF_THICKNESS);
  });

  it("sits the smoked backing in the MIDDLE, so each face reads against a body", () => {
    expect(FACE_Z.backing).toBe(0);
  });

  it("separates the two screens by 0.03, mirrored about the middle", () => {
    expect(2 * FACE_Z.screen).toBeCloseTo(0.03, 10);
  });

  it("stacks the layers outward: backing < screen < sheen < rim < bracket < glint", () => {
    const z = FACE_Z;
    expect(z.backing).toBeLessThan(z.screen);
    expect(z.screen).toBeLessThan(z.sheen);
    expect(z.sheen).toBeLessThan(z.rim);
    expect(z.rim).toBeLessThan(z.bracket);
    expect(z.bracket).toBeLessThan(z.glint);
  });
});

describe("frameOpacities", () => {
  it("animates the inner rim as 0.7 + 0.25·sin(2.2t)", () => {
    expect(frameOpacities(0, true).rimInner).toBeCloseTo(0.7, 10);
    const t = 1.3;
    expect(frameOpacities(t, true).rimInner).toBeCloseTo(0.7 + 0.25 * Math.sin(t * 2.2), 10);
  });

  it("animates the outer rim as 0.42·(0.8 + 0.2·sin(2.2t + 1))", () => {
    const t = 2.1;
    expect(frameOpacities(t, true).rimOuter).toBeCloseTo(0.42 * (0.8 + 0.2 * Math.sin(t * 2.2 + 1)), 10);
  });

  it("holds still when not animated: 0.85 inner, 0.42 outer — whatever the time", () => {
    for (const t of [0, 1.7, 99]) {
      const o = frameOpacities(t, false);
      expect(o.rimInner).toBe(0.85);
      expect(o.rimOuter).toBeCloseTo(0.42, 10);
    }
  });

  it("keeps the outer bracket a static 0.5 in both modes", () => {
    expect(frameOpacities(0.4, true).bracketOuter).toBe(0.5);
    expect(frameOpacities(0.4, false).bracketOuter).toBe(0.5);
  });

  it("never exceeds full opacity", () => {
    for (let t = 0; t < 20; t += 0.05) {
      const o = frameOpacities(t, true);
      expect(o.rimInner).toBeLessThanOrEqual(1);
      expect(o.rimOuter).toBeLessThanOrEqual(1);
    }
  });
});

describe("glint", () => {
  it("is a head plus a trail: six sprites per face", () => {
    expect(GLINT_TRAIL).toBe(6);
  });

  it("runs at 0.085 of the rim per second", () => {
    expect(glintProgress(2, 0, true)).toBeCloseTo(0.17, 10);
  });

  it("wraps around the rim and never leaves [0, 1)", () => {
    for (const t of [0, 3, 11.7, 1000, 123456.789]) {
      for (let k = 0; k < GLINT_TRAIL; k++) {
        const u = glintProgress(t, k, true);
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThan(1);
      }
    }
  });

  it("is frozen at t = 4.2 when not animated (reduced motion), whatever the clock says", () => {
    expect(GLINT_STATIC_T).toBe(4.2);
    expect(glintProgress(0, 0, false)).toBe(glintProgress(500, 0, false));
    expect(glintProgress(0, 0, false)).toBeCloseTo((4.2 * 0.085) % 1, 10);
  });

  it("lags the head by 0.007 of the rim per trail step", () => {
    const head = glintProgress(4.2, 0, true);
    for (let k = 1; k < GLINT_TRAIL; k++) {
      expect(head - glintProgress(4.2, k, true)).toBeCloseTo(k * 0.007, 10);
    }
  });

  it("still wraps correctly for a trail sprite whose lag crosses the start of the rim", () => {
    // Head at 0.003: the k=1 sprite is at 0.003 − 0.007 = −0.004 → must wrap to 0.996, not go negative.
    const t = 0.003 / 0.085;
    expect(glintProgress(t, 1, true)).toBeCloseTo(0.996, 10);
  });

  it("indexes the rim path by progress", () => {
    const path = Array.from({ length: 300 }, (_, i) => ({ x: i, y: 0 }));
    const p = glintPoint(path, 4.2, 0, true);
    expect(p.x).toBe(Math.floor(glintProgress(4.2, 0, true) * 299));
  });

  it("scales the head 0.15 and shrinks the trail by 0.014 per step", () => {
    expect(glintScale(0)).toBe(0.15);
    expect(glintScale(1)).toBeCloseTo(0.096, 10);
    expect(glintScale(5)).toBeCloseTo(0.04, 10);
  });

  it("fades the trail: head 0.9, then 0.5·(1 − k/6)", () => {
    expect(glintOpacity(0)).toBe(0.9);
    expect(glintOpacity(1)).toBeCloseTo(0.5 * (1 - 1 / 6), 10);
    expect(glintOpacity(5)).toBeCloseTo(0.5 * (1 - 5 / 6), 10);
    // monotonically dimmer down the trail
    for (let k = 1; k < GLINT_TRAIL - 1; k++) {
      expect(glintOpacity(k + 1)).toBeLessThan(glintOpacity(k));
    }
  });
});
