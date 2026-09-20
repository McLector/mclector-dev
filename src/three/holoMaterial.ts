import * as THREE from "three";

/**
 * The hologram's picture shader and its approved look — the round-2 mockup's
 * (docs/reference/2026-09-20-revamp-round-2-mockup.html), minus its review-only switches.
 *
 * Two paths blended by `uColor`: the cyan luminance ramp (0) and the photograph's real colour
 * (1). Luminance still drives the glow and alpha; the scanlines, the RGB fringe, the sweeping
 * band and the rim glow all stay — it is a recolour, not a removal. On the back face
 * (`uMask = 1`) the photo's own alpha is the silhouette, so only the subject is projected.
 *
 * Built as a raw ShaderMaterial with no `colorspace_fragment`: the texture's sRGB bytes go
 * straight to the framebuffer, which is correct. Decoding the texture as sRGB would DARKEN the
 * picture (measured: mean RGB 90/113/131 → 50/74/96), so the textures stay `NoColorSpace`.
 */

/** The approved "recommended" look. Every value is a uniform, so tuning it never touches the GLSL. */
export const HOLO_LOOK = {
  /** 0 = today's pure cyan ramp, 1 = the photograph's real colour. */
  uColor: 0.85,
  /** Saturation of the photograph path. */
  uSat: 1.35,
  /** Exposure lift (a gamma from 1 down to 0.45) — the dusk photo is dark. */
  uLift: 0.8,
  /** Minimum opacity the colour path adds, so dark areas don't vanish into the stage. */
  uBody: 0.38,
  /** Scanline depth. */
  uScan: 0.09,
  /** Horizontal RGB split, in UV. */
  uFringe: 0.003,
  /** Contrast of the luminance ramp (the photograph path uses 35% of the excess over 1). */
  uContrast: 2.0,
  /** Scanline density, in radians of `sin` per unit of V. */
  uFreq: 240,
  /** Strength of the soft spotlight that lights the subject and dims the periphery. */
  uSpot: 0.7,
} as const;

type Uniform<T> = { value: T };
export type HoloUniforms = { t: Uniform<number>; tint: Uniform<THREE.Color> } & {
  [K in keyof typeof HOLO_LOOK]: Uniform<number>;
};

/** One shared set of uniforms: both faces read the same objects, so one change moves both. */
export function createHoloUniforms(tint: THREE.ColorRepresentation): HoloUniforms {
  const uniforms: Record<string, Uniform<number | THREE.Color>> = {
    t: { value: 0 },
    tint: { value: new THREE.Color(tint) },
  };
  for (const [key, value] of Object.entries(HOLO_LOOK)) uniforms[key] = { value };
  return uniforms as HoloUniforms;
}

export const HOLO_VERTEX_SHADER =
  "varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";

/*
 * The scan band. The first version was `smoothstep(0.04, 0., bd)`, whose edges are the wrong way
 * round: for every `bd <= 0` — almost the whole card — it returns 1, so it added a +0.5 white
 * veil over the entire portrait with only a thin gap sweeping through it. That milky veil was the
 * biggest reason the picture looked flat. `smoothstep(0., 0.03, bd)` is the thin bright band it
 * was always meant to be (peak at the wrap point, ~3% of the card either side).
 */
export const HOLO_FRAGMENT_SHADER = `varying vec2 vU; uniform sampler2D map; uniform float t; uniform vec3 tint;
      uniform float uColor, uSat, uLift, uBody, uScan, uFringe, uContrast, uMask, uFreq, uSpot;
      float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
      void main(){
        vec4 tc = texture2D(map, vU);
        vec3 cr = texture2D(map, vU + vec2(uFringe, 0.)).rgb;
        vec3 cb = texture2D(map, vU - vec2(uFringe, 0.)).rgb;
        float lc = lum(tc.rgb), lr = lum(cr), lb = lum(cb);
        // --- cyan ramp (today's look) ---
        float l = pow(clamp(lc,0.,1.),0.7); l = clamp((l-0.34)*uContrast+0.42,0.,1.);
        vec3 h = mix(vec3(0.04,0.2,0.5),tint,smoothstep(0.1,0.6,l)); h = mix(h,vec3(0.85,0.97,1.),smoothstep(0.72,1.,l));
        h.r += (lr-lc)*0.6; h.b += (lb-lc)*0.6;
        // --- photographic path: real colour, RGB-split fringe, shadow lift, saturation, contrast ---
        vec3 p = vec3(cr.r, tc.g, cb.b);
        p = pow(p, vec3(mix(1., 0.45, uLift)));   // exposure: the dusk photo is dark
        float pg = lum(p); p = mix(vec3(pg), p, uSat);
        float k = 1. + (uContrast - 1.) * 0.35;
        p = clamp((p - 0.5) * k + 0.5, 0., 1.);
        // Subject spotlight: light the person, let the periphery fall away (photographic path only).
        float spot = 1. - smoothstep(0.18, 0.78, length((vU - vec2(0.5, 0.5)) * vec2(1.15, 1.)));
        p *= mix(1., 0.55 + 0.7 * spot, uSpot);
        vec3 base = mix(h * 1.15, p, uColor);
        float sl = (1. - uScan) + uScan * sin(vU.y*uFreq - t*3.);
        float bd = abs(fract(vU.y-t*0.1)-0.5)-0.47;
        float band = smoothstep(0.,0.03,bd) * 0.45;
        float flick = 0.9 + 0.07*sin(t*34.) + 0.05*sin(t*8.);
        vec3 col = base*sl*flick + band*0.6*vec3(0.85,0.97,1.);
        float edge = min(min(vU.x,1.-vU.x),min(vU.y,1.-vU.y)); col += tint*smoothstep(0.17,0.,edge)*0.5;
        float lumA = clamp(l*1.3+0.1,0.,1.);
        float a = clamp(lumA + uColor*uBody, 0., 1.) * smoothstep(0.,0.02,edge);
        if (uMask > 0.5) a = tc.a * clamp(0.78 + 0.22*lumA, 0., 1.) * smoothstep(0.,0.02,edge);
        gl_FragColor = vec4(col, a);
      }`;

/**
 * A hologram face. `side` is left at FrontSide on purpose: with the two faces 0.03 apart,
 * back-face culling is what stops each from showing through the other.
 */
export function createHoloMaterial(
  map: THREE.Texture,
  { mask }: { mask: boolean },
  shared: HoloUniforms,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...shared, map: { value: map }, uMask: { value: mask ? 1 : 0 } },
    vertexShader: HOLO_VERTEX_SHADER,
    fragmentShader: HOLO_FRAGMENT_SHADER,
  });
}
