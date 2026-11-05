import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { Profile } from "@/content/types";
import type { TierConfig } from "@/lib/capability";
import { useDocumentTheme } from "@/lib/useDocumentTheme";
import { BRACKET, FACE_Z, bracketCorners } from "./cardFrame";
import { createHoloMaterial, createHoloUniforms, setTexelFromImage, type HoloUniforms } from "./holoMaterial";
import { fitCameraPitched } from "./math/fitCamera";
import { blendingFor, holoPalette, type HoloPalette } from "./palette";
import {
  BASE_RADIUS,
  DASH_RING,
  SHAFT,
  SHAFT_BASE_Y,
  dashRing,
  dotFloor,
  projectorMotion,
  ringSpecs,
  shaftSpecs,
  tickSets,
  tickTransforms,
} from "./projector";
import {
  BACK_FRAMING,
  BOB,
  CAMERA_PITCH_DEG,
  CARD_Y,
  FOV,
  FRAME_MARGIN,
  FRONT_FRAMING,
  PED_Y,
  PH,
  PW,
  hologramFramePoints,
} from "./sceneDims";
import { createShaftGeometry, createShaftMaterial } from "./shaftMaterial";
import { loadPortraitTexture } from "./textures/portraitTexture";
import portraitUrl from "@/assets/portfolio-pic.jpg";
import formalUrl from "@/assets/formal-pic.webp";

const CARD_ASPECT = PW / PH;

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

type Disposable = { dispose: () => void };

type BuiltScene = {
  root: THREE.Group;
  cardGroup: THREE.Group;
  /** Shared by both faces: one clock, one look. */
  holo: HoloUniforms;
  /** Shared by every shaft of light. */
  shaftClock: { value: number };
  /** The three ring sets that turn slowly (see `projectorMotion`). */
  rings: { outer: THREE.Group; inner: THREE.Group; dash: THREE.Group };
  disposables: Disposable[];
};

/**
 * The projector under the card, built from the data in ./projector: HUD rings and tick marks on the floor, a
 * domed emitter with a ring of dashes, a dotted floor that fades out, and shafts of light rising behind the
 * card. Returns the group and the three ring sets that turn. `palette` sets the outer ring and shaft colours and
 * whether the light is added (dark theme) or drawn as ink (light theme).
 */
function buildProjector(track: <T extends Disposable>(o: T) => T, palette: HoloPalette) {
  const group = new THREE.Group();
  const blending = blendingFor(palette);
  const flat = (color: number, opacity: number) =>
    track(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
  const floorDisc = (radius: number, texture: THREE.Texture, opacity: number, y: number) => {
    const m = new THREE.Mesh(
      track(new THREE.PlaneGeometry(radius * 2, radius * 2)),
      track(
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          blending,
          depthWrite: false,
          opacity,
        }),
      ),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    return m;
  };
  const lathe = (profile: Array<[number, number]>, material: THREE.Material) =>
    new THREE.Mesh(
      track(
        new THREE.LatheGeometry(
          profile.map(([r, y]) => new THREE.Vector2(r, y)),
          72,
        ),
      ),
      material,
    );

  // ---- HUD rings: the thin outer ring, thick arcs, inner arcs and hairlines ----
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  for (const spec of ringSpecs(BASE_RADIUS, palette)) {
    const segments = Math.max(8, Math.ceil(spec.sweep * 24));
    const arc = new THREE.Mesh(
      track(new THREE.RingGeometry(spec.rIn, spec.rOut, segments, 1, spec.start, spec.sweep)),
      flat(spec.color, spec.opacity),
    );
    arc.rotation.x = -Math.PI / 2;
    arc.position.y = PED_Y + 0.006;
    (spec.group === "outer" ? outer : inner).add(arc);
  }

  // ---- tick marks: one InstancedMesh per run ----
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const matrix = new THREE.Matrix4();
  const unit = new THREE.Vector3(1, 1, 1);
  for (const set of tickSets(BASE_RADIUS)) {
    const placements = tickTransforms(set);
    const ticks = new THREE.InstancedMesh(
      track(new THREE.BoxGeometry(set.length, 0.004, set.width)),
      flat(set.color, set.opacity),
      placements.length,
    );
    placements.forEach((p, i) => {
      quaternion.setFromAxisAngle(up, p.rotationY);
      matrix.compose(new THREE.Vector3(p.x, PED_Y + 0.008, p.z), quaternion, unit);
      ticks.setMatrixAt(i, matrix);
    });
    ticks.instanceMatrix.needsUpdate = true;
    track(ticks);
    inner.add(ticks);
  }
  group.add(outer, inner);

  // ---- the emitter: a dark bezel, a white dome, a ring of dashes and a hot centre ----
  const lip = lathe(
    [
      [0.3, 0],
      [0.54, 0],
      [0.54, 0.05],
      [0.3, 0.07],
    ],
    track(
      new THREE.MeshStandardMaterial({
        color: 0x0b2233,
        metalness: 0.85,
        roughness: 0.35,
        emissive: new THREE.Color(0x0a2c44),
        emissiveIntensity: 0.6,
        envMapIntensity: 0.15,
      }),
    ),
  );
  lip.position.y = PED_Y;
  group.add(lip);

  const lipEdge = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.54, 0.014, 12, 96)),
    track(new THREE.MeshBasicMaterial({ color: 0xa6e6ff, transparent: true, opacity: 0.9 })),
  );
  lipEdge.rotation.x = Math.PI / 2;
  lipEdge.position.y = PED_Y + 0.055;
  group.add(lipEdge);

  const dome = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.3, 32, 16)),
    track(new THREE.MeshBasicMaterial({ color: 0xeafcff })),
  );
  dome.scale.set(1, 0.42, 1);
  dome.position.y = PED_Y + 0.06;
  group.add(dome);

  const dash = new THREE.Group();
  const dashGeometry = track(new THREE.BoxGeometry(DASH_RING.length, 0.01, DASH_RING.width));
  const dashMaterial = flat(0xbfe6ff, DASH_RING.opacity);
  for (const p of dashRing()) {
    const d = new THREE.Mesh(dashGeometry, dashMaterial);
    d.position.set(p.x, PED_Y + 0.01, p.z);
    d.rotation.y = p.rotationY;
    dash.add(d);
  }
  group.add(dash);

  const lipGlow = new THREE.Mesh(
    track(new THREE.RingGeometry(0.6, 0.8, 80)),
    flat(0x9fdcff, 0.12),
  );
  lipGlow.rotation.x = -Math.PI / 2;
  lipGlow.position.y = PED_Y + 0.004;
  group.add(lipGlow);
  group.add(
    floorDisc(
      BASE_RADIUS * 0.55,
      track(
        radialTexture([
          [0, "rgba(170,236,255,1)"],
          [0.32, "rgba(90,200,255,.45)"],
          [1, "rgba(0,0,0,0)"],
        ]),
      ),
      0.6,
      PED_Y + 0.02,
    ),
    floorDisc(
      0.8,
      track(
        radialTexture([
          [0, "rgba(255,255,255,1)"],
          [0.28, "rgba(190,240,255,.7)"],
          [1, "rgba(0,0,0,0)"],
        ]),
      ),
      0.9,
      PED_Y + 0.09,
    ),
  );

  // ---- the dotted floor, fading out with distance ----
  const dots = dotFloor(BASE_RADIUS);
  for (let i = 1; i < dots.positions.length; i += 3) dots.positions[i] = PED_Y + 0.003;
  const dotGeometry = track(new THREE.BufferGeometry());
  dotGeometry.setAttribute("position", new THREE.BufferAttribute(dots.positions, 3));
  dotGeometry.setAttribute("color", new THREE.BufferAttribute(dots.colors, 3));
  group.add(
    new THREE.Points(
      dotGeometry,
      track(
        new THREE.PointsMaterial({
          size: 0.04,
          vertexColors: true,
          transparent: true,
          blending,
          depthWrite: false,
          sizeAttenuation: true,
        }),
      ),
    ),
  );

  // ---- shafts of light, drawn first so the card sits on top ----
  const shaftClock = { value: 0 };
  for (const spec of shaftSpecs(SHAFT.count, SHAFT.seed, SHAFT.spread)) {
    const shaft = new THREE.Mesh(
      track(createShaftGeometry(spec.width, SHAFT.height)),
      track(createShaftMaterial(spec, shaftClock, palette)),
    );
    shaft.position.set(spec.x, SHAFT_BASE_Y, spec.z);
    shaft.rotation.z = spec.lean;
    shaft.renderOrder = -1;
    group.add(shaft);
  }

  return { group, shaftClock, rings: { outer, inner, dash } };
}

/**
 * A two-sided holographic ID card floating over a HUD projector: thick blue arcs, tick marks and a domed
 * emitter on the floor, with soft shafts of light rising behind the card. The card has no frame, only four
 * corner brackets. The front projects the portfolio photo in real colour; the back projects the formal
 * portrait with its background removed, so it reads as a floating bust. Built imperatively (ported from the
 * approved mock-up) and mounted via <primitive>; `useFrame` drives motion, gated by `animated` (false = still,
 * for low-end devices).
 *
 * The camera is not hand-placed: it is fitted to the object's real 3D extent for the canvas's current aspect
 * and tilted down a little (see math/fitCamera), so the hologram sits centred with headroom at any size.
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
  // The scene is rebuilt when the theme flips: the light theme draws ink, not added light, so it is a different
  // set of materials rather than a recolour. A toggle is rare, so the rebuild (and the photos' reload) is fine.
  const theme = useDocumentTheme();

  const built = useMemo<BuiltScene>(() => {
    const palette = holoPalette(theme);
    const disposables: Disposable[] = [];
    const track = <T extends Disposable>(o: T): T => {
      disposables.push(o);
      return o;
    };

    const root = new THREE.Group();

    // ---- card: a genuinely two-sided slab ----
    const cardGroup = new THREE.Group();
    cardGroup.position.y = CARD_Y;

    const holo = createHoloUniforms(palette.arc);

    // Frame tightly on the subject (the photo has a lot of dusk sky). focusX is
    // where the subject actually sits (≈ 0.49–0.50 of the photo's width), so they
    // land on the card's midline — and on the projector's axis.
    // Each face's material is made below; the photo decodes after that, so its onReady finds it here.
    const faceMaterials = new Map<THREE.Texture, THREE.ShaderMaterial>();
    const onReady = (tex: THREE.Texture) => {
      const m = faceMaterials.get(tex);
      if (m) setTexelFromImage(m, tex);
    };
    const frontTex = loadPortraitTexture(portraitUrl, CARD_ASPECT, FRONT_FRAMING, onReady);
    // The formal portrait, background removed (src/assets/formalPic.test.ts pins that it is a
    // real matte). It is square, so cover-cropping trims its sides; BACK_FRAMING keeps its full height.
    const backTex = loadPortraitTexture(formalUrl, CARD_ASPECT, BACK_FRAMING, onReady);
    track(frontTex);
    track(backTex);

    // Front screen at +z, back screen at −z rotated π so it faces backwards (and is not
    // mirrored). Both are FrontSide, so culling keeps each face from showing through the other.
    const screenGeo = track(new THREE.PlaneGeometry(PW, PH));
    for (const [texture, side, mask] of [
      [frontTex, 1, false],
      [backTex, -1, true],
    ] as const) {
      const faceMaterial = track(createHoloMaterial(texture, { mask }, holo));
      faceMaterials.set(texture, faceMaterial);
      const screen = new THREE.Mesh(screenGeo, faceMaterial);
      screen.position.z = side * FACE_Z.screen;
      if (side < 0) screen.rotation.y = Math.PI;
      cardGroup.add(screen);
    }

    // Corner brackets on both faces: the card's only frame.
    const bracketMaterial = track(
      new THREE.LineBasicMaterial({
        color: palette.arc,
        transparent: true,
        opacity: BRACKET.opacity,
        blending: blendingFor(palette),
      }),
    );
    for (const corner of bracketCorners()) {
      const geometry = track(
        new THREE.BufferGeometry().setFromPoints(corner.map((p) => new THREE.Vector3(p.x, p.y, 0))),
      );
      for (const side of [1, -1] as const) {
        const line = new THREE.Line(geometry, bracketMaterial);
        line.position.z = side * FACE_Z.bracket;
        cardGroup.add(line);
      }
    }
    root.add(cardGroup);

    const projector = buildProjector(track, palette);
    root.add(projector.group);

    return {
      root,
      cardGroup,
      holo,
      shaftClock: projector.shaftClock,
      rings: projector.rings,
      disposables,
    };
  }, [theme]);

  // Procedural environment for the emitter's metal.
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

  // Fit the camera to the object's real 3D extent for the current canvas aspect, tilted down by
  // CAMERA_PITCH_DEG, so the hologram is centred with headroom at any size. `size` is the layout
  // box (Canvas is told to ignore the window's scale transform).
  const framePoints = useMemo(() => hologramFramePoints(), []);
  useLayoutEffect(() => {
    const aspect = size.width / size.height;
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    const fit = fitCameraPitched(framePoints, FOV, aspect, FRAME_MARGIN, CAMERA_PITCH_DEG);
    camera.position.set(fit.position.x, fit.position.y, fit.position.z);
    camera.lookAt(fit.lookAt.x, fit.lookAt.y, fit.lookAt.z);
    camera.updateProjectionMatrix();
  }, [camera, framePoints, size.width, size.height]);

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
    // One clock for the picture shader and every shaft; held at 0 when not animating, which freezes their flicker.
    built.holo.t.value = animated ? tt : 0;
    built.shaftClock.value = animated ? tt : 0;

    if (!drag.current.active) {
      built.cardGroup.rotation.y += animated ? 0.0022 + drag.current.vx : drag.current.vx;
      drag.current.vx *= 0.94;
    }
    built.cardGroup.position.y = CARD_Y + (animated ? Math.sin(tt * 1.1) * BOB : 0);

    // The arcs and the dash ring turn slowly (all exactly still when not animating).
    const motion = projectorMotion(tt, animated);
    built.rings.outer.rotation.y = motion.outer;
    built.rings.inner.rotation.y = motion.inner;
    built.rings.dash.rotation.y = motion.dash;
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
