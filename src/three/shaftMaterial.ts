import * as THREE from "three";
import type { ShaftSpec } from "./projector";
import { CARD_Y, PH } from "./sceneDims";

/**
 * One teal shaft of light: a thin additive plane, brightest at the emitter and fading upward, with a gentle
 * flicker. Above the card's bottom edge it is dimmed to a faint floor, so the light rises BESIDE and below the
 * card but never streaks across the photo (the card is part see-through, so un-dimmed shafts showed through it).
 */

const TEAL = 0x2fd9c8;
const BLUE = 0x3db8ff;

/** How much of a shaft's light is left above the card's bottom edge. Soft, not a hard cut, and never black. */
export const SHAFT_CUT_FLOOR = 0.12;

/** The world height where the dimming begins: the card's bottom edge, with a little clearance. */
export const shaftCutY = (): number => CARD_Y - PH / 2 - 0.1;

export const SHAFT_VERTEX_SHADER =
  "varying vec2 vU; varying float vWy; void main(){ vU=uv; vec4 w=modelMatrix*vec4(position,1.); vWy=w.y; gl_Position=projectionMatrix*viewMatrix*w; }";

export const SHAFT_FRAGMENT_SHADER = `varying vec2 vU; varying float vWy; uniform vec3 col; uniform float op, t, ph, sp, uCutY, uCutF;
        void main(){
          float x = abs(vU.x - 0.5) * 2.;
          float core = pow(1. - x, 1.1);
          float up = pow(1. - vU.y, 1.25) * smoothstep(0., 0.05, vU.y);
          // A gentle flicker; step() freezes it when the clock is held at 0 (not animated).
          float fl = 0.86 + 0.14 * sin(t * sp + ph) * step(0.001, t);
          // Dim over the card, ramping across 0.5 units around its bottom edge.
          float cut = mix(1., uCutF, smoothstep(uCutY - 0.35, uCutY + 0.15, vWy));
          gl_FragColor = vec4(mix(col, vec3(0.85, 1., 1.), core * 0.35), core * up * op * fl * cut);
        }`;

/** A shaft's material. `clock` is the one `{ value }` every shaft shares, so one tick moves them all. */
export function createShaftMaterial(spec: ShaftSpec, clock: { value: number }): THREE.ShaderMaterial {
  if (!(spec.opacity > 0 && spec.opacity <= 1)) {
    throw new RangeError(`shaft opacity must be in (0, 1], got ${spec.opacity}`);
  }
  if (!Number.isFinite(spec.phase) || !Number.isFinite(spec.speed)) {
    throw new RangeError("shaft phase and speed must be finite");
  }
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Drawn BEHIND the card (see renderOrder in the scene), so the light is never occluded by or over it.
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uCutY: { value: shaftCutY() },
      uCutF: { value: SHAFT_CUT_FLOOR },
      t: clock,
      col: { value: new THREE.Color(spec.teal ? TEAL : BLUE) },
      op: { value: spec.opacity },
      ph: { value: spec.phase },
      sp: { value: spec.speed },
    },
    vertexShader: SHAFT_VERTEX_SHADER,
    fragmentShader: SHAFT_FRAGMENT_SHADER,
  });
}

/** A plane that stands UP from its origin: the bottom edge at y = 0, so the shaft can be set on the floor. */
export function createShaftGeometry(width: number, height: number): THREE.PlaneGeometry {
  for (const [name, v] of [
    ["width", width],
    ["height", height],
  ] as const) {
    if (!Number.isFinite(v) || v <= 0) throw new RangeError(`shaft ${name} must be a positive, finite number, got ${v}`);
  }
  return new THREE.PlaneGeometry(width, height).translate(0, height / 2, 0);
}
