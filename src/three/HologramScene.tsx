import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { Profile } from "@/content/types";
import type { TierConfig } from "@/lib/capability";
import { loadPortraitTexture } from "./textures/portraitTexture";
import portraitUrl from "@/assets/portfolio-pic.jpg";

const ARC = 0x5ec8ff;
const PW = 1.95;
const PH = 2.45;
const DEP = 0.13;
const FZ = DEP * 0.5;
const CARD_ASPECT = PW / PH;

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

function radialGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(150,230,255,.95)");
  g.addColorStop(0.5, "rgba(90,200,255,.25)");
  g.addColorStop(1, "rgba(0,0,0,0)");
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

type BuiltScene = {
  root: THREE.Group;
  cardGroup: THREE.Group;
  pedGroup: THREE.Group;
  holo: THREE.ShaderMaterial;
  edge: THREE.LineLoop;
  beam: THREE.Mesh;
  core: THREE.Mesh;
  dots: THREE.Mesh[];
  disposables: Array<{ dispose: () => void }>;
};

/**
 * A holographic ID card floating over a sci-fi projector pedestal + light
 * beam, replacing the old lanyard. Built imperatively (ported from the
 * approved mockup) and mounted via <primitive>; `useFrame` drives motion,
 * gated by `animated` (false = static, for reduced-motion / low-end).
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

  const built = useMemo<BuiltScene>(() => {
    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };

    const root = new THREE.Group();

    // ---- card ----
    const cardGroup = new THREE.Group();
    cardGroup.position.y = 0.55;

    const portraitTex = loadPortraitTexture(portraitUrl, CARD_ASPECT);
    disposables.push(portraitTex);

    const backMat = track(
      new THREE.MeshStandardMaterial({ color: 0x0a1526, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide }),
    );
    const back = new THREE.Mesh(track(new THREE.PlaneGeometry(PW + 0.18, PH + 0.18)), backMat);
    back.position.z = -FZ;
    cardGroup.add(back);

    const holo = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { map: { value: portraitTex }, t: { value: 0 }, tint: { value: new THREE.Color(ARC) } },
        vertexShader:
          "varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec2 vU;uniform sampler2D map;uniform float t;uniform vec3 tint;void main(){vec4 c=texture2D(map,vU);float scan=0.92+0.08*sin(vU.y*190.0 - t*3.0);float hl=smoothstep(0.08,0.0,abs((vU.x*0.72+vU.y*0.28) - fract(t*0.045)));vec3 col=mix(c.rgb,tint,0.2)*scan + hl*0.2;float ex=smoothstep(0.0,0.04,vU.x)*smoothstep(1.0,0.96,vU.x);float ey=smoothstep(0.0,0.03,vU.y)*smoothstep(1.0,0.97,vU.y);gl_FragColor=vec4(col,0.95*ex*ey+0.05);}",
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
    pedGroup.position.y = -1.9;
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
          emissiveIntensity: 0.5,
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
    ringLine(1.3, 0.5);
    ringLine(0.95, 0.4);

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

    const cglow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(2.2, 2.2)),
      track(
        new THREE.MeshBasicMaterial({
          map: track(radialGlowTexture()),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    cglow.rotation.x = -Math.PI / 2;
    cglow.position.y = 0.09;
    pedGroup.add(cglow);
    root.add(pedGroup);

    // ---- beam ----
    const beam = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.05, 0.7, 1.7, 32, 1, true)),
      track(
        new THREE.MeshBasicMaterial({
          color: ARC,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    beam.position.y = -1.0;
    root.add(beam);
    const core = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.02, 0.05, 1.7, 16, 1, true)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0xdff4ff,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    core.position.y = -1.0;
    root.add(core);

    return { root, cardGroup, pedGroup, holo, edge, beam, core, dots, disposables };
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

  useEffect(() => {
    camera.lookAt(0, -0.25, 0);
  }, [camera]);

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

    if (!drag.current.active) {
      built.cardGroup.rotation.y += animated ? 0.0022 + drag.current.vx : drag.current.vx;
      drag.current.vx *= 0.94;
    }
    built.cardGroup.position.y = 0.55 + (animated ? Math.sin(tt * 1.1) * 0.05 : 0);
    (built.edge.material as THREE.LineBasicMaterial).opacity = animated ? 0.7 + 0.25 * Math.sin(tt * 2.2) : 0.85;

    if (animated) {
      (built.beam.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.04 * Math.sin(tt * 6);
      (built.core.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.12 * Math.sin(tt * 6);
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
