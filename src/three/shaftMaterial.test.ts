import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  SHAFT_CUT_FLOOR,
  SHAFT_FRAGMENT_SHADER,
  SHAFT_VERTEX_SHADER,
  createShaftGeometry,
  createShaftMaterial,
  shaftCutY,
} from "./shaftMaterial";
import { CARD_Y, PH } from "./sceneDims";
import type { ShaftSpec } from "./projector";

/**
 * One teal shaft of light: a thin additive plane that is brightest at the emitter, fades upward, and is
 * dimmed above the card's bottom edge so the light never streaks across the photo (the owner's "too strong
 * on the card" note). THREE builds a ShaderMaterial without a GL context, so this all runs in jsdom; the
 * GLSL is checked as normalised text.
 */
const glsl = SHAFT_FRAGMENT_SHADER.replace(/\s+/g, "");
const vert = SHAFT_VERTEX_SHADER.replace(/\s+/g, "");

const spec: ShaftSpec = { x: 0.2, z: 0.05, width: 0.2, opacity: 0.6, phase: 1.5, speed: 1.1, lean: -0.06, teal: true };

describe("createShaftMaterial", () => {
  const clock = { value: 0 };
  const mat = createShaftMaterial(spec, clock);

  it("is an additive, depth-free, two-sided transparent material (it must glow BEHIND the card, not occlude)", () => {
    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false);
    expect(mat.depthTest).toBe(false);
    expect(mat.blending).toBe(THREE.AdditiveBlending);
    expect(mat.side).toBe(THREE.DoubleSide);
  });

  it("SHARES one clock object across shafts, so one tick moves them all", () => {
    const other = createShaftMaterial({ ...spec, x: -0.3 }, clock);
    expect(mat.uniforms.t).toBe(clock);
    expect(other.uniforms.t).toBe(clock);
  });

  it("carries the spec's opacity, flicker phase and flicker speed", () => {
    expect(mat.uniforms.op.value).toBe(0.6);
    expect(mat.uniforms.ph.value).toBe(1.5);
    expect(mat.uniforms.sp.value).toBe(1.1);
  });

  it("is teal for a teal shaft and blue for the others", () => {
    const blue = createShaftMaterial({ ...spec, teal: false }, clock);
    expect(mat.uniforms.col.value.getHex()).not.toBe(blue.uniforms.col.value.getHex());
    const c = mat.uniforms.col.value as THREE.Color;
    expect(c.g).toBeGreaterThan(c.r); // teal leans green-blue, never red
  });

  it("does not share its colour, between shafts", () => {
    const other = createShaftMaterial(spec, clock);
    expect(other.uniforms.col).not.toBe(mat.uniforms.col);
  });

  it("rejects an opacity outside (0, 1] and a non-finite phase", () => {
    expect(() => createShaftMaterial({ ...spec, opacity: 0 }, clock)).toThrow(RangeError);
    expect(() => createShaftMaterial({ ...spec, opacity: 1.5 }, clock)).toThrow(RangeError);
    expect(() => createShaftMaterial({ ...spec, phase: Number.NaN }, clock)).toThrow(RangeError);
  });
});

describe("the dim zone over the card", () => {
  it("starts at the card's bottom edge (the card centre minus half its height, with a little clearance)", () => {
    expect(shaftCutY()).toBeCloseTo(CARD_Y - PH / 2 - 0.1, 9);
  });

  it("leaves 12% of the light above that edge: soft, not a hard cut, and never black", () => {
    expect(SHAFT_CUT_FLOOR).toBe(0.12);
    expect(SHAFT_CUT_FLOOR).toBeGreaterThan(0);
    expect(SHAFT_CUT_FLOOR).toBeLessThan(1);
  });

  it("hands both numbers to the shader", () => {
    const m = createShaftMaterial(spec, { value: 0 });
    expect(m.uniforms.uCutY.value).toBeCloseTo(shaftCutY(), 9);
    expect(m.uniforms.uCutF.value).toBe(SHAFT_CUT_FLOOR);
  });

  it("works out world height in the vertex shader, and dims over it with a smooth ramp in the fragment shader", () => {
    expect(vert).toContain("vec4w=modelMatrix*vec4(position,1.);");
    expect(vert).toContain("vWy=w.y;");
    expect(glsl).toContain("floatcut=mix(1.,uCutF,smoothstep(uCutY-0.35,uCutY+0.15,vWy));");
    expect(glsl).toContain("core*up*op*fl*cut");
  });
});

describe("SHAFT_FRAGMENT_SHADER", () => {
  it("is brightest at the centre line and soft at the sides", () => {
    expect(glsl).toContain("floatx=abs(vU.x-0.5)*2.;");
    expect(glsl).toContain("floatcore=pow(1.-x,1.1);");
  });

  it("fades upward from the emitter, with a short fade-in so the base has no hard edge", () => {
    expect(glsl).toContain("pow(1.-vU.y,1.25)*smoothstep(0.,0.05,vU.y)");
  });

  it("flickers by a gentle 14%, and never when frozen (t = 0)", () => {
    expect(glsl).toContain("0.86+0.14*sin(t*sp+ph)*step(0.001,t)");
  });

  it("declares every uniform it reads", () => {
    for (const name of ["col", "op", "t", "ph", "sp", "uCutY", "uCutF"]) {
      expect(new RegExp(`\\b${name}\\b`).test(SHAFT_FRAGMENT_SHADER), name).toBe(true);
    }
  });
});

describe("createShaftGeometry", () => {
  it("is a plane that stands UP from its origin: the bottom at y = 0, the top at the shaft's height", () => {
    const g = createShaftGeometry(0.2, 3.9);
    g.computeBoundingBox();
    // Vertex positions are stored as 32-bit floats, so compare to about 6 places.
    expect(g.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(g.boundingBox!.max.y).toBeCloseTo(3.9, 6);
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeCloseTo(0.2, 6);
  });

  it.each([
    [0, 3],
    [-0.1, 3],
    [0.2, 0],
    [Number.NaN, 3],
    [0.2, Infinity],
  ])("rejects a width of %s and a height of %s", (w, h) => {
    expect(() => createShaftGeometry(w, h)).toThrow(RangeError);
  });
});
