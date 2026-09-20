import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  HOLO_FRAGMENT_SHADER,
  HOLO_LOOK,
  createHoloMaterial,
  createHoloUniforms,
} from "./holoMaterial";

/**
 * Pins the approved round-2 look. THREE builds a ShaderMaterial without a GL context, so all
 * of this runs in jsdom. The GLSL itself is checked as normalised text (whitespace removed).
 */
const glsl = HOLO_FRAGMENT_SHADER.replace(/\s+/g, "");

describe("HOLO_LOOK — the approved 'recommended' preset", () => {
  it("is exactly the values the owner approved in the mockup", () => {
    expect(HOLO_LOOK).toEqual({
      uColor: 0.85,
      uSat: 1.35,
      uLift: 0.8,
      uBody: 0.38,
      uScan: 0.09,
      uFringe: 0.003,
      uContrast: 2.0,
      uFreq: 240,
      uSpot: 0.7,
    });
  });
});

describe("createHoloUniforms", () => {
  it("starts every look uniform at its approved value and the clock at 0", () => {
    const u = createHoloUniforms(0x5ec8ff);
    for (const [key, value] of Object.entries(HOLO_LOOK)) {
      expect((u as unknown as Record<string, { value: number }>)[key].value, key).toBe(value);
    }
    expect(u.t.value).toBe(0);
  });

  it("carries the tint colour", () => {
    expect(createHoloUniforms(0x5ec8ff).tint.value.getHex()).toBe(0x5ec8ff);
  });
});

describe("createHoloMaterial", () => {
  const frontTex = new THREE.Texture();
  const backTex = new THREE.Texture();
  const shared = createHoloUniforms(0x5ec8ff);
  const front = createHoloMaterial(frontTex, { mask: false }, shared);
  const back = createHoloMaterial(backTex, { mask: true }, shared);

  it("masks by the photo's own alpha on the back face only", () => {
    expect(front.uniforms.uMask.value).toBe(0);
    expect(back.uniforms.uMask.value).toBe(1);
  });

  it("gives each face its own texture", () => {
    expect(front.uniforms.map.value).toBe(frontTex);
    expect(back.uniforms.map.value).toBe(backTex);
  });

  it("SHARES the look uniforms and the clock between the faces, so one change moves both", () => {
    for (const key of [...Object.keys(HOLO_LOOK), "t", "tint"]) {
      expect(front.uniforms[key], key).toBe(back.uniforms[key]);
    }
    shared.uColor.value = 0.5;
    expect(back.uniforms.uColor.value).toBe(0.5);
    shared.uColor.value = HOLO_LOOK.uColor;
  });

  it("does not share the map or the mask between the faces", () => {
    expect(front.uniforms.map).not.toBe(back.uniforms.map);
    expect(front.uniforms.uMask).not.toBe(back.uniforms.uMask);
  });

  it("is a transparent, depth-write-free material", () => {
    for (const m of [front, back]) {
      expect(m.transparent).toBe(true);
      expect(m.depthWrite).toBe(false);
    }
  });

  it("stays FRONT-face only: back-face culling is what stops the two faces bleeding through each other", () => {
    for (const m of [front, back]) expect(m.side).toBe(THREE.FrontSide);
  });
});

describe("HOLO_FRAGMENT_SHADER", () => {
  it("uses the FIXED scan band: a thin bright band, 0.45 strength", () => {
    expect(glsl).toContain("smoothstep(0.,0.03,bd)*0.45");
  });

  it("never returns to the inverted band that veiled the whole card white", () => {
    // smoothstep(0.04, 0., bd) is 1 for every bd <= 0 — i.e. almost everywhere — so it added a
    // +0.5 white veil across the entire portrait. It was the largest reason the picture was flat.
    expect(glsl).not.toContain("smoothstep(0.04,0.,bd)");
  });

  it("has no legacy switch — the review scaffolding is not shipped", () => {
    expect(glsl).not.toContain("uLegacy");
  });

  it("references every look uniform and the mask (nothing is declared but unused)", () => {
    for (const key of [...Object.keys(HOLO_LOOK), "uMask", "tint"]) {
      expect(new RegExp(`\\b${key}\\b`).test(HOLO_FRAGMENT_SHADER), key).toBe(true);
    }
  });

  it("lifts exposure with a gamma from 1 to 0.45, then spotlights the subject", () => {
    expect(glsl).toContain("pow(p,vec3(mix(1.,0.45,uLift)))");
    expect(glsl).toContain("smoothstep(0.18,0.78,length((vU-vec2(0.5,0.5))*vec2(1.15,1.)))");
    expect(glsl).toContain("p*=mix(1.,0.55+0.7*spot,uSpot)");
  });

  it("blends the cyan ramp (×1.15) with the photograph, and applies NO further global gain", () => {
    expect(glsl).toContain("mix(h*1.15,p,uColor)");
    expect(glsl).toContain("gl_FragColor=vec4(col,a);");
    expect(glsl).not.toContain("vec4(col*1.15");
  });

  it("takes the back face's silhouette from the photo's alpha", () => {
    expect(glsl).toContain("if(uMask>0.5)a=tc.a*clamp(0.78+0.22*lumA,0.,1.)*smoothstep(0.,0.02,edge);");
  });
});
