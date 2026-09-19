import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { Profile } from "@/content/types";
import type { TierConfig } from "@/lib/capability";
import { fitCamera } from "./math/fitCamera";
import {
  BOB,
  CARD_Y,
  DEP,
  FOV,
  FRAME_MARGIN,
  PED_Y,
  PH,
  PW,
  hologramFramePoints,
} from "./sceneDims";
import { loadPortraitTexture } from "./textures/portraitTexture";
import portraitUrl from "@/assets/portfolio-pic.jpg";

const ARC = 0x5ec8ff;
const FZ = DEP * 0.5;
const CARD_ASPECT = PW / PH;

/** Where the projector beam starts (just above the pedestal plate) and how tall it is. */
const BEAM_Y0 = PED_Y + 0.09;
const BEAM_H = 4.5;
/** Beam intensity — the owner reviewed the mockup at its slider minimum and kept it. */
const BEAM_GAIN = 0.4;

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A 128×128 radial-gradient texture from `[offset, css colour]` stops. */
function radialTexture(stops: Array<[number, string]>): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [offset, colour] of stops) g.addColorStop(offset, colour);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function envTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#0a1836");
  g.addColorStop(0.5, "#2f7194");
  g.addColorStop(0.62, "#0d2036");
  g.addColorStop(1, "#05060d");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 256);
  x.fillStyle = "rgba(150,225,255,.85)";
  x.beginPath();
  x.arc(150, 80, 42, 0, 7);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

/**
 * One shell of the projector beam. A truncated cone (narrow emitter at the
 * pedestal, fanning wide upward), shaded with three interleaved sets of thin
 * rays, a vertical falloff that reaches zero before the rim, a hot base, a soft
 * limb, and a horizontal edge fade so the fan never hard-cuts against the frame.
 * The rays are keyed to the angle around the axis, so they read as straight
 * shafts of light springing from the emitter.
 */
function beamMaterial(
  shared: BeamUniforms,
  strength: number,
  freq: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Drawn BEHIND the card (see renderOrder) — the light must not streak the portrait.
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { ...shared, uStr: { value: strength }, uFreq: { value: freq } },
    vertexShader: `
      varying vec3 vPos; varying vec3 vN; varying vec3 vW; varying vec3 vView; varying float vV;
      uniform float uY0; uniform float uH;
      void main(){
        vPos = position;
        vN = normalize(normalMatrix * normal);
        vec4 w = modelMatrix * vec4(position, 1.);
        vW = w.xyz;
        vV = (w.y - uY0) / uH;
        vec4 mv = viewMatrix * w;
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vPos; varying vec3 vN; varying vec3 vW; varying vec3 vView; varying float vV;
      uniform float t; uniform vec3 tint; uniform float uGain; uniform float uEdge;
      uniform float uStr; uniform float uFreq;
      void main(){
        float a = atan(vPos.z, vPos.x);
        // Striation: three interleaved ray sets, slowly drifting.
        float r = 0.;
        r += pow(abs(sin(a * uFreq * 0.5 + 0.7 + t * 0.05)), 5.) * 0.9;
        r += pow(abs(sin(a * uFreq * 1.1 + 2.1 - t * 0.07)), 9.) * 0.75;
        r += pow(abs(sin(a * uFreq * 1.9 + 4.3 + t * 0.03)), 14.) * 0.6;
        float v = clamp(vV, 0., 1.);
        float fall = pow(1. - smoothstep(0., 0.9, v), 1.3);
        float hot = exp(-v * 4.5);
        float nv = abs(dot(normalize(vN), normalize(vView)));
        float limb = mix(0.5, 1., nv);
        float edge = 1. - smoothstep(uEdge * 0.70, uEdge * 0.97, abs(vW.x));
        float base = (0.16 + r) * fall + hot * 0.55;
        float alpha = base * limb * edge * smoothstep(0., 0.03, v) * uStr * uGain;
        vec3 col = mix(tint, vec3(0.86, 0.97, 1.), clamp(hot * 0.9 + r * 0.12, 0., 1.));
        gl_FragColor = vec4(col, alpha);
      }`,
  });
}

type BeamUniforms = {
  t: { value: number };
  tint: { value: THREE.Color };
  uGain: { value: number };
  uEdge: { value: number };
  uY0: { value: number };
  uH: { value: number };
};

type BuiltScene = {
  root: THREE.Group;
  cardGroup: THREE.Group;
  pedGroup: THREE.Group;
  holo: THREE.ShaderMaterial;
  edge: THREE.LineLoop;
  core: THREE.Mesh;
  dots: THREE.Mesh[];
  beamUniforms: BeamUniforms;
  disposables: Array<{ dispose: () => void }>;
};

/**
 * A holographic ID card floating over a sci-fi projector pedestal, lit by a
 * fanned, striated light cone that spreads UP and out from a hot emitter — the
 * way a real hologram projector reads. Built imperatively (ported from the
 * approved mockup) and mounted via <primitive>; `useFrame` drives motion, gated
 * by `animated` (false = static, for reduced-motion / low-end).
 *
 * The camera is not hand-placed: it is fitted to the object's real 3D extent
 * for the canvas's current aspect (see math/fitCamera), so the hologram sits
 * centred with headroom at any size.
 */
export default function HologramScene({
  profile: _profile,
  config: _config,
  animated,
}: {
  profile: Profile;
  config?: TierConfig;
  animated: boolean;
}) {
  const { gl, camera, scene } = useThree();
  const size = useThree((s) => s.size);

  const built = useMemo<BuiltScene>(() => {
    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };

    const root = new THREE.Group();

    // ---- card ----
    const cardGroup = new THREE.Group();
    cardGroup.position.y = CARD_Y;

    // Frame tightly on the subject (the photo has a lot of dusk sky). focusX is
    // where the subject actually sits (≈ 0.49–0.50 of the photo's width), so they
    // land on the card's midline — and on the pedestal's axis.
    const portraitTex = loadPortraitTexture(portraitUrl, CARD_ASPECT, {
      zoom: 1.5,
      focusX: 0.495,
      focusY: 0.6,
    });
    disposables.push(portraitTex);

    // A faint smoked-glass backing so the projection has a hint of body, but
    // stays mostly see-through — the hologram reads as light, not a photo.
    const back = new THREE.Mesh(
      track(new THREE.PlaneGeometry(PW + 0.18, PH + 0.18)),
      track(new THREE.MeshBasicMaterial({ color: 0x061020, transparent: true, opacity: 0.18, side: THREE.DoubleSide })),
    );
    back.position.z = -FZ;
    cardGroup.add(back);

    const holo = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { map: { value: portraitTex }, t: { value: 0 }, tint: { value: new THREE.Color(ARC) } },
        vertexShader:
          "varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: `
          varying vec2 vU;
          uniform sampler2D map;
          uniform float t;
          uniform vec3 tint;
          float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
          void main(){
            // Chromatic-split sample for a holographic RGB fringe.
            float off = 0.006;
            float lr = lum(texture2D(map, vU + vec2(off, 0.0)).rgb);
            float lc = lum(texture2D(map, vU).rgb);
            float lb = lum(texture2D(map, vU - vec2(off, 0.0)).rgb);
            // Lift the dark subject, then push contrast so it separates.
            float l = pow(clamp(lc, 0.0, 1.0), 0.7);
            l = clamp((l - 0.34) * 1.75 + 0.42, 0.0, 1.0);
            // Cyan hologram ramp: deep blue -> tint -> white-hot.
            vec3 holo = mix(vec3(0.04, 0.2, 0.5), tint, smoothstep(0.1, 0.6, l));
            holo = mix(holo, vec3(0.85, 0.97, 1.0), smoothstep(0.72, 1.0, l));
            holo.r += (lr - lc) * 0.6;
            holo.b += (lb - lc) * 0.6;
            // Hard scanlines + a bright scan band sweeping up + interlace flicker.
            float sl = 0.72 + 0.28 * sin(vU.y * 168.0 - t * 3.0);
            float band = smoothstep(0.04, 0.0, abs(fract(vU.y - t * 0.1) - 0.5) - 0.47);
            float flick = 0.9 + 0.07 * sin(t * 34.0) + 0.05 * sin(t * 8.0);
            vec3 col = holo * sl * flick + band * 0.6 * vec3(0.85, 0.97, 1.0);
            // Edge rim glow — the projection is brightest at its border.
            float edge = min(min(vU.x, 1.0 - vU.x), min(vU.y, 1.0 - vU.y));
            col += tint * smoothstep(0.17, 0.0, edge) * 0.5;
            // Alpha: the glowing subject is opaque, dark background see-through.
            float a = clamp(l * 1.3 + 0.1, 0.0, 1.0) * smoothstep(0.0, 0.02, edge);
            gl_FragColor = vec4(col * 1.15, a);
          }
        `,
      }),
    );
    const screen = new THREE.Mesh(track(new THREE.PlaneGeometry(PW, PH)), holo);
    screen.position.z = FZ - 0.05;
    cardGroup.add(screen);

    const bezShape = roundedRect(PW + 0.17, PH + 0.17, 0.2);
    bezShape.holes.push(roundedRect(PW - 0.03, PH - 0.03, 0.14));
    const bezGeo = track(
      new THREE.ExtrudeGeometry(bezShape, {
        depth: DEP,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 4,
        steps: 1,
        curveSegments: 28,
      }),
    );
    bezGeo.center();
    const bezel = new THREE.Mesh(
      bezGeo,
      track(
        new THREE.MeshPhysicalMaterial({
          color: 0x18233c,
          metalness: 0.72,
          roughness: 0.15,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          emissive: new THREE.Color(0x0a1c3a),
          emissiveIntensity: 0.26,
          envMapIntensity: 1.3,
        }),
      ),
    );
    cardGroup.add(bezel);

    const cover = new THREE.Mesh(
      track(new THREE.PlaneGeometry(PW, PH)),
      track(
        new THREE.MeshPhysicalMaterial({
          color: 0xbfeaff,
          metalness: 0,
          roughness: 0.05,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          transparent: true,
          opacity: 0.05,
          envMapIntensity: 1.7,
          depthWrite: false,
        }),
      ),
    );
    cover.position.z = FZ + 0.012;
    cardGroup.add(cover);

    const edge = new THREE.LineLoop(
      track(new THREE.BufferGeometry().setFromPoints(roundedRect(PW + 0.02, PH + 0.02, 0.14).getPoints(120))),
      track(new THREE.LineBasicMaterial({ color: ARC, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })),
    );
    edge.position.z = FZ + 0.02;
    cardGroup.add(edge);

    const bracket = (cx: number, cy: number, sx: number, sy: number) => {
      const L = 0.26;
      const g = track(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(cx, cy - sy * L, 0),
          new THREE.Vector3(cx, cy, 0),
          new THREE.Vector3(cx - sx * L, cy, 0),
        ]),
      );
      const l = new THREE.Line(
        g,
        track(new THREE.LineBasicMaterial({ color: ARC, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })),
      );
      l.position.z = FZ + 0.03;
      cardGroup.add(l);
    };
    const hw = (PW + 0.06) / 2;
    const hh = (PH + 0.06) / 2;
    bracket(hw, hh, 1, 1);
    bracket(-hw, hh, -1, 1);
    bracket(hw, -hh, 1, -1);
    bracket(-hw, -hh, -1, -1);
    root.add(cardGroup);

    // ---- pedestal ----
    const pedGroup = new THREE.Group();
    pedGroup.position.y = PED_Y;
    const plate = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.75, 1.9, 0.12, 64)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x0e1c30,
          metalness: 0.85,
          roughness: 0.35,
          emissive: new THREE.Color(0x08172c),
          emissiveIntensity: 0.3,
        }),
      ),
    );
    pedGroup.add(plate);

    const rimTorus = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.68, 0.05, 16, 80)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x1a3a5c,
          metalness: 0.9,
          roughness: 0.25,
          emissive: new THREE.Color(ARC),
          emissiveIntensity: 0.8,
        }),
      ),
    );
    rimTorus.rotation.x = Math.PI / 2;
    rimTorus.position.y = 0.07;
    pedGroup.add(rimTorus);

    const ringLine = (rad: number, op: number) => {
      const r = new THREE.Mesh(
        track(new THREE.RingGeometry(rad - 0.012, rad + 0.012, 80)),
        track(
          new THREE.MeshBasicMaterial({
            color: ARC,
            transparent: true,
            opacity: op,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
        ),
      );
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.075;
      pedGroup.add(r);
    };
    ringLine(1.3, 0.55);
    ringLine(0.95, 0.5);
    ringLine(0.55, 0.45);

    const dashMat = track(
      new THREE.MeshBasicMaterial({ color: ARC, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }),
    );
    const dashGeo = track(new THREE.BoxGeometry(0.06, 0.006, 0.02));
    for (let d = 0; d < 40; d++) {
      const a = (d / 40) * Math.PI * 2;
      const seg = new THREE.Mesh(dashGeo, dashMat);
      seg.position.set(Math.cos(a) * 1.12, 0.08, Math.sin(a) * 1.12);
      seg.rotation.y = -a;
      pedGroup.add(seg);
    }

    const dots: THREE.Mesh[] = [];
    const dotGeo = track(new THREE.SphereGeometry(0.045, 10, 10));
    for (let p = 0; p < 18; p++) {
      const a = (p / 18) * Math.PI * 2;
      const dm = track(
        new THREE.MeshBasicMaterial({ color: ARC, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }),
      );
      const ds = new THREE.Mesh(dotGeo, dm);
      ds.position.set(Math.cos(a) * 1.62, 0.1, Math.sin(a) * 1.62);
      ds.userData.ph = p * 0.5;
      dots.push(ds);
      pedGroup.add(ds);
    }

    // A hotter emitter: a wide soft pool of light on the plate, and a white-hot
    // core at its centre — the source the beam visibly springs from.
    const pool = new THREE.Mesh(
      track(new THREE.PlaneGeometry(3.7, 3.7)),
      track(
        new THREE.MeshBasicMaterial({
          map: track(
            radialTexture([
              [0, "rgba(170,236,255,1)"],
              [0.32, "rgba(90,200,255,.45)"],
              [1, "rgba(0,0,0,0)"],
            ]),
          ),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.09;
    pedGroup.add(pool);

    const core = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.5, 1.5)),
      track(
        new THREE.MeshBasicMaterial({
          map: track(
            radialTexture([
              [0, "rgba(255,255,255,1)"],
              [0.28, "rgba(190,240,255,.7)"],
              [1, "rgba(0,0,0,0)"],
            ]),
          ),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.1;
    pedGroup.add(core);
    root.add(pedGroup);

    // ---- projector beam: narrow emitter fanning wide UPWARD, behind the card ----
    const beamUniforms: BeamUniforms = {
      t: { value: 0 },
      tint: { value: new THREE.Color(ARC) },
      uGain: { value: BEAM_GAIN },
      uEdge: { value: 2.2 }, // set from the camera fit, once the canvas size is known
      uY0: { value: BEAM_Y0 },
      uH: { value: BEAM_H },
    };
    const outer = new THREE.Mesh(
      track(new THREE.CylinderGeometry(3.0, 1.0, BEAM_H, 96, 1, true)),
      track(beamMaterial(beamUniforms, 0.2, 30)),
    );
    outer.position.y = BEAM_Y0 + BEAM_H / 2;
    outer.renderOrder = -1;
    root.add(outer);

    const inner = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.35, 0.55, BEAM_H * 0.8, 64, 1, true)),
      track(beamMaterial(beamUniforms, 0.26, 18)),
    );
    inner.position.y = BEAM_Y0 + BEAM_H * 0.4;
    inner.renderOrder = -1;
    root.add(inner);

    // A soft vertical bloom along the axis and a halo behind the card. Sprites
    // always face the camera; both are drawn first so the card sits on top.
    const bloomMat = track(
      new THREE.SpriteMaterial({
        map: track(
          radialTexture([
            [0, "rgba(150,225,255,.8)"],
            [0.4, "rgba(80,190,255,.22)"],
            [1, "rgba(0,0,0,0)"],
          ]),
        ),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0.5 * BEAM_GAIN,
      }),
    );
    const bloom = new THREE.Sprite(bloomMat);
    bloom.scale.set(2.6, 5.4, 1);
    bloom.position.set(0, -0.15, -0.5);
    bloom.renderOrder = -2;
    root.add(bloom);

    const haloMat = track(
      new THREE.SpriteMaterial({
        map: track(
          radialTexture([
            [0, "rgba(120,210,255,.55)"],
            [0.5, "rgba(60,150,255,.14)"],
            [1, "rgba(0,0,0,0)"],
          ]),
        ),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0.55,
      }),
    );
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(4.6, 4.9, 1);
    halo.position.set(0, CARD_Y, -0.7);
    halo.renderOrder = -2;
    root.add(halo);

    return { root, cardGroup, pedGroup, holo, edge, core, dots, beamUniforms, disposables };
  }, []);

  // Procedural environment for the metal/glass reflections.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const eq = envTexture();
    const env = pmrem.fromEquirectangular(eq).texture;
    const prev = scene.environment;
    scene.environment = env;
    return () => {
      scene.environment = prev;
      eq.dispose();
      pmrem.dispose();
      env.dispose();
    };
  }, [gl, scene, built]);

  // Fit the camera to the object's real 3D extent for the current canvas aspect,
  // so the hologram is centred with headroom at any size. `size` is the layout
  // box (Canvas is told to ignore the window's scale transform).
  const framePoints = useMemo(() => hologramFramePoints(), []);
  useLayoutEffect(() => {
    const aspect = size.width / size.height;
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    const fit = fitCamera(framePoints, FOV, aspect, FRAME_MARGIN);
    camera.position.set(0, fit.y, fit.z);
    camera.lookAt(0, fit.y, 0);
    camera.updateProjectionMatrix();
    // The beam fades out before the frame's edge at the beam's depth.
    built.beamUniforms.uEdge.value = Math.tan((FOV * Math.PI) / 360) * aspect * fit.z;
  }, [camera, built, framePoints, size.width, size.height]);

  // Dispose everything on unmount.
  useEffect(() => {
    const built0 = built;
    return () => {
      for (const d of built0.disposables) d.dispose();
    };
  }, [built]);

  // Drag-to-spin (works in static mode too — user-initiated).
  const drag = useRef({ active: false, lx: 0, ly: 0, vx: 0 });
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current.active = true;
      drag.current.lx = e.clientX;
      drag.current.ly = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.lx;
      const dy = e.clientY - drag.current.ly;
      drag.current.lx = e.clientX;
      drag.current.ly = e.clientY;
      built.cardGroup.rotation.y += dx * 0.007;
      built.cardGroup.rotation.x = Math.max(-0.4, Math.min(0.5, built.cardGroup.rotation.x + dy * 0.004));
      drag.current.vx = dx * 0.007;
    };
    const up = () => {
      drag.current.active = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl, built]);

  const t = useRef(0);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    t.current += dt;
    const tt = t.current;
    built.holo.uniforms.t.value = animated ? tt : 0;
    built.beamUniforms.t.value = animated ? tt : 0;

    if (!drag.current.active) {
      built.cardGroup.rotation.y += animated ? 0.0022 + drag.current.vx : drag.current.vx;
      drag.current.vx *= 0.94;
    }
    built.cardGroup.position.y = CARD_Y + (animated ? Math.sin(tt * 1.1) * BOB : 0);
    (built.edge.material as THREE.LineBasicMaterial).opacity = animated ? 0.7 + 0.25 * Math.sin(tt * 2.2) : 0.85;

    if (animated) {
      (built.core.material as THREE.MeshBasicMaterial).opacity = 0.85 + 0.15 * Math.sin(tt * 5);
      for (const d of built.dots) {
        (d.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.4 * Math.sin(tt * 2.5 + (d.userData.ph as number));
      }
      built.pedGroup.rotation.y = tt * 0.05;
    }
  });

  return (
    <>
      <ambientLight color={0x8098c8} intensity={0.55} />
      <directionalLight color={0xffffff} intensity={1.2} position={[3, 4, 5]} />
      <directionalLight color={0x66e6ff} intensity={1.0} position={[-4, -1, -3]} />
      <primitive object={built.root} />
    </>
  );
}
