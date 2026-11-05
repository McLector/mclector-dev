import * as THREE from "three";

/**
 * The hologram's picture shader. Its look started as the round-2 mockup's
 * (docs/reference/2026-09-20-revamp-round-2-mockup.html) and was retuned to read as a clearer photograph
 * with only subtle holographic cues, after first-impression feedback that it was too busy.
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

/** The current look. Every value is a uniform, so tuning it never touches the GLSL. */
export const HOLO_LOOK = {
  /** 0 = today's pure cyan ramp, 1 = the photograph's real colour. */
  uColor: 0.93,
  /** Saturation of the photograph path. */
  uSat: 1.1,
  /** Exposure lift (a gamma from 1 down to 0.45) — the dusk photo is dark. */
  uLift: 0.8,
  /** Minimum opacity the colour path adds, so dark areas don't vanish into the stage. */
  uBody: 0.62,
  /** Scanline depth. */
  uScan: 0.05,
  /** Horizontal RGB split, in UV. */
  uFringe: 0.0008,
  /** Contrast of the luminance ramp (the photograph path uses 35% of the excess over 1). */
  uContrast: 2.0,
  /** Scanline density, in radians of `sin` per unit of V. */
  uFreq: 560,
  /** Strength of the soft spotlight that lights the subject and dims the periphery. */
  uSpot: 0.35,
  /** Unsharp-mask strength on the photograph, so the face reads crisply. */
  uSharp: 0.5,
  /** How far the picture fades when the card turns edge-on, as a projected image would. */
  uGrazing: 0.6,
  /** Lit from the projector below: brighter and cyan-warmer at the bottom edge, dimmer at the top. Gentle: 0.5 read as too strong. */
  uLight: 0.2,
  /** Sideways shear, in UV, of the thin interference band that slides up the picture. */
  uGlitch: 0.006,
  /** Width of the card's edge fade, in card space (0.5 is the centre). With no frame, the picture melts into the dark over this. */
  uFeather: 0.04,
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

/*
 * `vU` is the card's own 0..1 space (edge fade, spotlight, scanlines); `vT` is the same point run through
 * the texture's repeat/offset matrix, i.e. where the photo is sampled. A raw ShaderMaterial gets no
 * automatic `map` transform, so without `vT` the focal crop set in portraitTexture.ts was silently
 * ignored and both photos showed uncropped: the subject small, in a lot of sky.
 */
export const HOLO_VERTEX_SHADER =
  "varying vec2 vU;varying vec2 vT;varying vec3 vN;varying vec3 vView;uniform mat3 uvTransform;void main(){vU=uv;vT=(uvTransform*vec3(uv,1.)).xy;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}";

/*
 * The scan band. The first version was `smoothstep(0.04, 0., bd)`, whose edges are the wrong way
 * round: for every `bd <= 0` — almost the whole card — it returns 1, so it added a +0.5 white
 * veil over the entire portrait with only a thin gap sweeping through it. That milky veil was the
 * biggest reason the picture looked flat. `smoothstep(0., 0.03, bd)` is the thin bright band it
 * was always meant to be (peak at the wrap point, ~3% of the card either side).
 */
export const HOLO_FRAGMENT_SHADER = `varying vec2 vU; varying vec2 vT; varying vec3 vN; varying vec3 vView; uniform sampler2D map; uniform float t; uniform vec3 tint;
      uniform vec2 uTexel;
      uniform float uColor, uSat, uLift, uBody, uScan, uFringe, uContrast, uMask, uFreq, uSpot, uSharp, uGrazing, uLight, uGlitch, uFeather;
      float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
      void main(){
        // A thin band slides up the picture and shears it sideways; never when frozen (t = 0).
        float gy = fract(t*0.13);
        float gm = (1. - smoothstep(0., 0.025, abs(vU.y - gy))) * step(0.001, t);
        vec2 vTg = vT + vec2(uGlitch * gm * sin(vU.y*300. + t*30.), 0.);
        vec4 tc = texture2D(map, vTg);
        vec3 cr = texture2D(map, vTg + vec2(uFringe, 0.)).rgb;
        vec3 cb = texture2D(map, vTg - vec2(uFringe, 0.)).rgb;
        // Unsharp mask: the photo minus a 4-tap blur of itself, added back, so the face stays crisp.
        vec3 blur = 0.25 * (texture2D(map, vTg + vec2(uTexel.x, 0.)).rgb + texture2D(map, vTg - vec2(uTexel.x, 0.)).rgb
                          + texture2D(map, vTg + vec2(0., uTexel.y)).rgb + texture2D(map, vTg - vec2(0., uTexel.y)).rgb);
        float lc = lum(tc.rgb), lr = lum(cr), lb = lum(cb);
        // --- cyan ramp (today's look) ---
        float l = pow(clamp(lc,0.,1.),0.7); l = clamp((l-0.34)*uContrast+0.42,0.,1.);
        vec3 h = mix(vec3(0.04,0.2,0.5),tint,smoothstep(0.1,0.6,l)); h = mix(h,vec3(0.85,0.97,1.),smoothstep(0.72,1.,l));
        h.r += (lr-lc)*0.6; h.b += (lb-lc)*0.6;
        // --- photographic path: real colour, RGB-split fringe, shadow lift, saturation, contrast ---
        vec3 p = vec3(cr.r, tc.g, cb.b) + (tc.rgb - blur) * uSharp;
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
        float band = smoothstep(0.,0.03,bd) * 0.15;
        float flick = 0.975 + 0.015*sin(t*8.);
        vec3 col = base*sl*flick + band*0.6*vec3(0.85,0.97,1.);
        col *= 1. + uLight * (0.5 - vU.y);
        col += tint * uLight * 0.35 * pow(1. - vU.y, 4.);
        float edge = min(min(vU.x,1.-vU.x),min(vU.y,1.-vU.y)); col += tint*smoothstep(0.06,0.,edge)*0.3;
        float lumA = clamp(l*1.3+0.1,0.,1.);
        float a = clamp(lumA + uColor*uBody, 0., 1.) * smoothstep(0.,uFeather,edge);
        if (uMask > 0.5) a = tc.a * clamp(0.78 + 0.22*lumA, 0., 1.) * smoothstep(0.,uFeather,edge);
        // A projected image thins out as the card turns edge-on.
        float nv = abs(dot(normalize(vN), normalize(vView)));
        a *= mix(1., smoothstep(0.1, 0.7, nv), uGrazing);
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
  // One texel of the FULL image (the crop is already folded into vT). Until the image decodes, a
  // 1024px guess; HologramScene corrects it from the loader's onReady via `setTexelFromImage`.
  const img = map.image as { width?: number; height?: number } | undefined;
  const uTexel = new THREE.Vector2(1 / (img?.width || 1024), 1 / (img?.height || 1024));
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...shared,
      map: { value: map },
      uvTransform: { value: map.matrix },
      uTexel: { value: uTexel },
      uMask: { value: mask ? 1 : 0 },
    },
    vertexShader: HOLO_VERTEX_SHADER,
    fragmentShader: HOLO_FRAGMENT_SHADER,
  });
}

/** Point a face's sharpening at the real texel size once its photo has decoded. */
export function setTexelFromImage(material: THREE.ShaderMaterial, tex: THREE.Texture): void {
  const img = tex.image as { width?: number; height?: number } | undefined;
  if (img?.width && img?.height) material.uniforms.uTexel.value.set(1 / img.width, 1 / img.height);
}
