import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { extend, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, Sparkles, useDetectGPU } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  interactionGroups,
  useAfterPhysicsStep,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { Profile } from "@/content/types";
import { TIER_CONFIG, type TierConfig } from "@/lib/capability";
import { E2E_FREEZE_STEPS, isE2EMode } from "./e2eMode";
import { computeDragTarget, grabOffsetFor } from "./math/dragPlane";
import { createBadgeFaceTexture, createBandTexture } from "./textures/createTextures";
import "./meshline.d";

extend({ MeshLineGeometry, MeshLineMaterial });

// --- Scene constants ---------------------------------------------------------
/** Half-extents of the card collider; the visual RoundedBox is 1.6 × 2.25 × 0.02. */
const CARD_HALF = [0.8, 1.125, 0.01] as const;
/** The spherical joint hangs from the card's TOP edge, not its centre — that
 *  is what makes it swing like a badge instead of pivoting like a compass. */
const CARD_TOP_ANCHOR: [number, number, number] = [0, CARD_HALF[1], 0];
const ROPE_SEGMENT = 1;
/** World-space Y of the fixed anchor (the <group> the chain lives in). */
const ANCHOR_Y = 4;
const REST_EPSILON = 0.08;
const REST_SECONDS = 2;
/** Seconds the scene must stay below REST_EPSILON before ?e2e=1 freezes it. */
const E2E_REST_WINDOW = 0.6;
/** Extra damping applied only under ?e2e=1, so baselines settle in a couple of
 *  seconds instead of twenty. Damping changes how fast the badge reaches rest,
 *  not where rest is, so the frozen pose is the same one production settles to. */
const E2E_DAMPING = { linearDamping: 12, angularDamping: 10 } as const;

/**
 * The lanyard is driven ENTIRELY by joints, so none of its colliders should
 * ever collide with anything — including each other. This is not a tidiness
 * detail: the spherical joint puts j3 exactly on the card's top edge, so j3's
 * ball sits permanently inside the card's cuboid. The solver then spends every
 * step trying to push two constrained bodies apart, which pumps energy into the
 * chain, makes the strap jitter and means the badge never actually settles.
 * Membership in group 0, filtering against nothing, removes all of that.
 */
const NO_COLLISIONS = interactionGroups(0, []);

/** Constant identity so r3f never tears down and rebuilds the strap material. */
const MESHLINE_MATERIAL_ARGS: [{ resolution: THREE.Vector2 }] = [
  { resolution: new THREE.Vector2(1, 1) },
];

const SEGMENT_PROPS = {
  type: "dynamic",
  canSleep: true,
  colliders: false,
  angularDamping: 4,
  linearDamping: 4,
} as const;

/** The cool/warm accent pair the pass is skinned with. */
export type Accent = { from: string; to: string };

type BandProps = {
  profile: Profile;
  config: TierConfig;
  accent: Accent;
  frozen: boolean;
  onRestChange: (resting: boolean) => void;
};

function Band({ profile, config, accent, frozen, onRestChange }: BandProps) {
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const band = useRef<THREE.Mesh>(null!);

  const { width, height } = useThree((state) => state.size);

  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const grabOffset = useRef(new THREE.Vector3());
  const restTimer = useRef(0);
  const steps = useRef(0);
  /** ?e2e=1 freeze state: 0 = settling, 1 = snap this frame, 2 = fully frozen. */
  const frozenStage = useRef<0 | 1 | 2>(0);

  // Scratch vectors, allocated once — useFrame runs 60×/s.
  const scratch = useMemo(
    () => ({
      cardPosition: new THREE.Vector3(),
      target: new THREE.Vector3(),
      topAnchor: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      angular: new THREE.Vector3(),
      current: new THREE.Vector3(),
      lerped: [new THREE.Vector3(), new THREE.Vector3()],
      lerpedReady: false,
    }),
    [],
  );

  const segmentDamping = frozen ? E2E_DAMPING : null;

  // The accent that lights the badge's halo — the cool end of the selected
  // pass theme, so the halo matches the world the visitor picked.
  const glowColor = accent.from;

  const curve = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    c.curveType = "chordal";
    return c;
  }, []);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT]);
  useSphericalJoint(j3, card, [[0, 0, 0], CARD_TOP_ANCHOR]);

  const faceTexture = useMemo(
    () =>
      createBadgeFaceTexture({
        displayName: profile.displayName,
        title: profile.badge.title,
        subtitle: profile.badge.subtitle,
        idLabel: profile.badge.idLabel,
        caption: profile.badge.caption,
        accentFrom: accent.from,
        accentTo: accent.to,
      }),
    [profile, accent],
  );

  const bandTexture = useMemo(
    () =>
      createBandTexture({
        accentFrom: accent.from,
        accentTo: accent.to,
        label: profile.handle,
      }),
    [profile, accent],
  );

  useEffect(() => {
    return () => {
      faceTexture?.dispose();
      bandTexture?.dispose();
    };
  }, [faceTexture, bandTexture]);

  useEffect(() => {
    document.body.style.cursor = dragging ? "grabbing" : hovered ? "grab" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [dragging, hovered]);

  const wake = useCallback(() => {
    for (const ref of [fixed, j1, j2, j3, card]) ref.current?.wakeUp();
    restTimer.current = 0;
    onRestChange(false);
  }, [onRestChange]);

  /**
   * Put the whole chain in its exact analytic rest pose: each rope segment
   * hanging straight down from the anchor, the card square-on with identity
   * rotation, every velocity zeroed. Only ever called under ?e2e=1 — it is
   * what makes a visual baseline reproducible, rather than merely settled.
   */
  const applyCanonicalPose = useCallback(() => {
    const zero = { x: 0, y: 0, z: 0 };
    const identity = { x: 0, y: 0, z: 0, w: 1 };
    const poses: Array<[typeof j1, number]> = [
      [j1, ANCHOR_Y - ROPE_SEGMENT],
      [j2, ANCHOR_Y - ROPE_SEGMENT * 2],
      [j3, ANCHOR_Y - ROPE_SEGMENT * 3],
      [card, ANCHOR_Y - ROPE_SEGMENT * 3 - CARD_TOP_ANCHOR[1]],
    ];
    for (const [ref, y] of poses) {
      const body = ref.current;
      if (!body) continue;
      body.setTranslation({ x: 0, y, z: 0 }, true);
      body.setRotation(identity, true);
      body.setLinvel(zero, true);
      body.setAngvel(zero, true);
    }
  }, []);

  /**
   * Pin the canonical pose AFTER each solver step and BEFORE @react-three/rapier
   * writes the body transforms onto their Object3Ds. Doing it here rather than in
   * useFrame is what makes the frozen frame reproducible: it no longer matters how
   * many fixed steps a given frame happened to run, because the last thing to touch
   * the bodies before they are rendered is always this exact pose.
   *
   * Note this is also why ?e2e=1 does NOT set `<Physics paused>` — a paused world
   * skips the sync entirely, so the meshes would keep rendering whatever transform
   * they had when the pause landed, which is precisely the pose we are replacing.
   */
  useAfterPhysicsStep(() => {
    if (frozen && frozenStage.current >= 1) applyCanonicalPose();
  });

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      const target = event.target as Element & { setPointerCapture?: (id: number) => void };
      target.setPointerCapture?.(event.pointerId);

      const body = card.current;
      if (!body) return;
      const translation = body.translation();
      scratch.cardPosition.set(translation.x, translation.y, translation.z);
      grabOffsetFor(event.camera, event.pointer, scratch.cardPosition, grabOffset.current);

      body.setBodyType(2 /* KinematicPositionBased */, true);
      setDragging(true);
      wake();
    },
    [scratch, wake],
  );

  const onPointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const target = event.target as Element & { releasePointerCapture?: (id: number) => void };
      target.releasePointerCapture?.(event.pointerId);
      card.current?.setBodyType(0 /* Dynamic */, true);
      setDragging(false);
      wake();
    },
    [wake],
  );

  useFrame((state, delta) => {
    const bodies = [fixed.current, j1.current, j2.current, j3.current, card.current];
    if (bodies.some((body) => !body)) return;
    const dt = Math.min(delta, 1 / 30); // a tab regaining focus must not teleport the card

    // Once ?e2e=1 has decided to freeze, re-assert the canonical pose on EVERY
    // frame. Setting it once is not enough: pausing <Physics> goes through React
    // state, so a solver step or two still lands afterwards and nudges the chain
    // off the pose by a pixel or three — which is exactly the sort of drift that
    // makes a screenshot baseline flake.
    const pinned = frozen && frozenStage.current >= 1;
    if (pinned) applyCanonicalPose();

    if (dragging && !pinned) {
      for (const body of bodies) body!.wakeUp();
      const translation = card.current.translation();
      scratch.cardPosition.set(translation.x, translation.y, translation.z);
      computeDragTarget(
        state.camera,
        state.pointer,
        scratch.cardPosition,
        grabOffset.current,
        scratch.target,
      );
      card.current.setNextKinematicTranslation({
        x: scratch.target.x,
        y: scratch.target.y,
        z: scratch.target.z,
      });
    }

    // --- Anti-jitter: lerp the mid joints toward their true translation at a
    // clamped speed. Without the clamp the strap visibly vibrates, because the
    // solver nudges these bodies by tiny amounts every single step.
    const mids = [j1.current, j2.current];
    for (let i = 0; i < mids.length; i++) {
      const translation = mids[i]!.translation();
      scratch.current.set(translation.x, translation.y, translation.z);
      if (!scratch.lerpedReady || pinned) {
        // Snap exactly on the freeze frame: the lerp converges asymptotically
        // and would otherwise keep nudging the strap by sub-pixel amounts
        // forever, which is enough to break a screenshot baseline.
        scratch.lerped[i].copy(scratch.current);
      } else {
        const distance = scratch.lerped[i].distanceTo(scratch.current);
        const clamped = Math.max(0.1, Math.min(1, distance));
        scratch.lerped[i].lerp(scratch.current, dt * (10 + clamped * 40));
      }
    }
    scratch.lerpedReady = true;

    // --- Rebuild the strap ribbon ----------------------------------------
    const cardTranslation = card.current.translation();
    const cardRotation = card.current.rotation();
    scratch.quaternion.set(cardRotation.x, cardRotation.y, cardRotation.z, cardRotation.w);
    scratch.topAnchor
      .set(CARD_TOP_ANCHOR[0], CARD_TOP_ANCHOR[1], CARD_TOP_ANCHOR[2])
      .applyQuaternion(scratch.quaternion)
      .add(new THREE.Vector3(cardTranslation.x, cardTranslation.y, cardTranslation.z));

    const j3t = j3.current.translation();
    const fixedT = fixed.current.translation();
    curve.points[0].copy(scratch.topAnchor);
    curve.points[1].set(j3t.x, j3t.y, j3t.z);
    curve.points[2].copy(scratch.lerped[1]);
    curve.points[3].copy(scratch.lerped[0]);
    curve.points[4].set(fixedT.x, fixedT.y, fixedT.z);

    const geometry = band.current?.geometry as MeshLineGeometry | undefined;
    geometry?.setPoints(curve.getPoints(32));

    if (bandTexture && !frozen) {
      bandTexture.offset.x -= dt * 0.12;
    }

    // --- Gently unwind the card so its face returns toward the camera ------
    // Skipped entirely under ?e2e=1: this nudge is frame-rate dependent, so on
    // a slow software rasteriser it feeds energy back into the pendulum and the
    // scene never settles. Without it the badge decays to rest by damping alone.
    if (!dragging && !frozen) {
      const angular = card.current.angvel();
      scratch.angular.set(angular.x, angular.y, angular.z);
      card.current.setAngvel(
        { x: scratch.angular.x, y: scratch.angular.y - cardRotation.y * 0.25, z: scratch.angular.z },
        true,
      );
    }

    // --- Rest detection: pause the solver once everything has settled ------
    steps.current += 1;

    if (frozen) {
      if (frozenStage.current === 1) {
        // The first pinned frame has been built from the canonical pose; from
        // here every frame reproduces it exactly.
        frozenStage.current = 2;
        // Signal for visual-regression runners: prefer
        //   await page.waitForSelector('html[data-pass-e2e-frozen="true"]')
        // over sleeping for an arbitrary number of seconds.
        document.documentElement.dataset.passE2eFrozen = "true";
        return;
      }
      if (frozenStage.current === 2) return;
      const linear = card.current.linvel();
      const angular = card.current.angvel();
      const speed =
        Math.hypot(linear.x, linear.y, linear.z) +
        Math.hypot(angular.x, angular.y, angular.z);
      // Wait for a genuine rest, then pin the exact canonical pose.
      //
      // The sustained window matters: a swinging pendulum passes through zero
      // velocity at every turning point, so an instantaneous `speed < epsilon`
      // check freezes mid-swing at an arbitrary amplitude. Requiring the speed
      // to STAY low is what tells "at rest" apart from "momentarily stationary".
      // The step count is only a cap for a renderer too slow to ever get there.
      //
      // Settling alone is still not enough for a baseline, because rest is not
      // unique: a chain on rope joints hangs happily at any yaw, so two runs
      // settle to two different (both perfectly valid) poses. So on the freeze
      // frame we overwrite the pose with the analytic one — straight down from
      // the anchor, identity rotation — which is reproducible by construction.
      restTimer.current = speed < REST_EPSILON ? restTimer.current + dt : 0;
      if (restTimer.current > E2E_REST_WINDOW || steps.current >= E2E_FREEZE_STEPS) {
        applyCanonicalPose();
        onRestChange(true);
        frozenStage.current = 1;
      }
      return;
    }

    if (dragging) {
      restTimer.current = 0;
      return;
    }
    const linear = card.current.linvel();
    const speed = Math.hypot(linear.x, linear.y, linear.z) + scratch.angular.length();
    restTimer.current = speed < REST_EPSILON ? restTimer.current + dt : 0;
    if (restTimer.current > REST_SECONDS) onRestChange(true);
  });

  return (
    <>
      <group position={[0, ANCHOR_Y, 0]}>
        <RigidBody ref={fixed} type="fixed" colliders={false} />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...SEGMENT_PROPS} {...segmentDamping}>
          <BallCollider args={[0.1]} collisionGroups={NO_COLLISIONS} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...SEGMENT_PROPS} {...segmentDamping}>
          <BallCollider args={[0.1]} collisionGroups={NO_COLLISIONS} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...SEGMENT_PROPS} {...segmentDamping}>
          <BallCollider args={[0.1]} collisionGroups={NO_COLLISIONS} />
        </RigidBody>

        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          type={dragging ? "kinematicPosition" : "dynamic"}
          colliders={false}
          canSleep
          angularDamping={frozen ? E2E_DAMPING.angularDamping : 2}
          linearDamping={frozen ? E2E_DAMPING.linearDamping : 4}
        >
          <CuboidCollider
            args={[CARD_HALF[0], CARD_HALF[1], CARD_HALF[2]]}
            collisionGroups={NO_COLLISIONS}
          />
          <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Accent glow halo behind the badge. Additive + toneMapped={false}
                so its pixels stay above the bloom threshold and bleed a soft
                rim of light — the single biggest "premium" cue, and it works
                even on tiers where the bloom pass is switched off. */}
            <mesh position={[0, 0, -0.06]} scale={[1.35, 1.24, 1]}>
              <planeGeometry args={[1.6, 2.25]} />
              <meshBasicMaterial
                color={glowColor}
                transparent
                opacity={0.16}
                toneMapped={false}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* The plastic body — dark smoked plastic with a strong clearcoat,
                so it reads as glossy in the dark rather than a bright white
                rectangle. No map: RoundedBox is an ExtrudeGeometry whose
                front-face UVs are in shape units, not normalised 0..1, so a
                texture applied here would land squashed into a corner. */}
            <RoundedBox args={[1.6, 2.25, 0.02]} radius={0.06} smoothness={4} castShadow>
              <meshPhysicalMaterial
                color="#14141c"
                clearcoat={1}
                clearcoatRoughness={0.1}
                roughness={0.4}
                metalness={0.1}
                reflectivity={0.6}
              />
            </RoundedBox>

            {/* The printed face, on a plane whose UVs are 0..1 by construction.
                Sits a hair proud of the body on both sides to avoid z-fighting. */}
            {faceTexture ? (
              <>
                <mesh position={[0, 0, 0.0115]}>
                  <planeGeometry args={[1.54, 2.19]} />
                  <meshPhysicalMaterial
                    map={faceTexture}
                    clearcoat={1}
                    clearcoatRoughness={0.15}
                    roughness={0.35}
                    metalness={0.05}
                    reflectivity={0.6}
                  />
                </mesh>
                {/* The back is an iridescent, holographic sheet — a rainbow
                    sheen that shifts with the viewing angle, like the reference
                    badge's underside. No map: the iridescence IS the artwork. */}
                <mesh position={[0, 0, -0.0115]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[1.54, 2.19]} />
                  <meshPhysicalMaterial
                    color="#0b0b12"
                    metalness={0.85}
                    roughness={0.22}
                    clearcoat={1}
                    clearcoatRoughness={0.12}
                    iridescence={1}
                    iridescenceIOR={1.3}
                    iridescenceThicknessRange={[120, 820]}
                  />
                </mesh>
              </>
            ) : null}

            {/* Clip (ring) and clamp, parented to the card so they translate with it. */}
            <mesh position={[0, 1.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.11, 0.025, 12, 32]} />
              <meshStandardMaterial color="#c9ccd6" metalness={1} roughness={0.25} />
            </mesh>
            <RoundedBox args={[0.34, 0.16, 0.05]} radius={0.02} smoothness={3} position={[0, 1.12, 0]}>
              <meshStandardMaterial color="#9aa0ad" metalness={1} roughness={0.25} />
            </RoundedBox>
          </group>
        </RigidBody>
      </group>

      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          // MeshLineMaterial's constructor requires a parameters object with a
          // `resolution`, so r3f types `args` as required. The array identity is
          // module-level and constant, so the material is never rebuilt; the live
          // size arrives through the `resolution` prop below.
          args={MESHLINE_MATERIAL_ARGS}
          color="#ffffff"
          depthTest={false}
          resolution={[width, height]}
          lineWidth={0.85}
          map={bandTexture ?? undefined}
          useMap={bandTexture ? 1 : 0}
          repeat={[-3, 1]}
          transparent
        />
      </mesh>

      {config.starfield && !frozen ? (
        <Sparkles count={300} scale={[14, 12, 6]} size={2.4} speed={0.3} opacity={0.5} noise={0.4} />
      ) : null}
    </>
  );
}

/**
 * Folds drei's live GPU tier into the capability decision. This runs *inside*
 * the lazy chunk on purpose: `useDetectGPU` pulls in `detect-gpu`, and the
 * initial-bundle budget cannot afford it. A tier-0 GPU reports upward so
 * PassCard can swap in the static badge.
 */
function GpuGate({
  onTier,
}: {
  onTier: (gpuTier: number) => void;
}) {
  const gpu = useDetectGPU();
  useEffect(() => {
    onTier(gpu?.tier ?? 2);
  }, [gpu, onTier]);
  return null;
}

export type LanyardSceneProps = {
  profile: Profile;
  /** Tier config resolved in the initial bundle by useSceneCapability. */
  config?: TierConfig;
  /** The pass theme's accent pair. Defaults to the profile placeholder. */
  accent?: Accent;
  /** Called with drei's live GPU tier once detection resolves. */
  onGpuTier?: (gpuTier: number) => void;
};

export default function LanyardScene({
  profile,
  config = TIER_CONFIG.medium,
  accent,
  onGpuTier,
}: LanyardSceneProps) {
  const resolvedAccent: Accent = accent ?? {
    from: profile.avatar.placeholder.from,
    to: profile.avatar.placeholder.to,
  };
  const frozen = useMemo(() => isE2EMode(), []);
  const [resting, setResting] = useState(false);

  const onRestChange = useCallback((value: boolean) => {
    setResting((previous) => (previous === value ? previous : value));
  }, []);

  const noopTier = useCallback(() => {}, []);

  return (
    <>
      <ambientLight intensity={frozen ? 1.2 : 0.9} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} />

      {/* Rapier's WASM boots asynchronously, so <Physics> must sit under Suspense. */}
      <Suspense fallback={null}>
        <Physics
          gravity={[0, -40, 0]}
          timeStep={1 / 60}
          // Interpolation blends the rendered transform between physics states
          // using an accumulator alpha that depends on frame timing, so under
          // ?e2e=1 it reintroduces exactly the frame-to-frame wobble the freeze
          // exists to remove. Smooth in production, off for baselines.
          interpolate={!frozen}
          numSolverIterations={config.physicsSubsteps > 1 ? 8 : 4}
          paused={resting && !frozen}
        >
          <Band profile={profile} config={config} accent={resolvedAccent} frozen={frozen} onRestChange={onRestChange} />
        </Physics>
        <GpuGate onTier={onGpuTier ?? noopTier} />
      </Suspense>

      {/*
        Procedural lightformers rather than <Environment preset="city">: the
        preset streams an HDR from a CDN, which costs a round-trip, breaks
        offline dev, and makes ?e2e=1 baselines depend on the network. The
        specular response is what sells the plastic — it is not optional, but
        it does not have to be downloaded.
      */}
      <Environment resolution={256} blur={0.75}>
        <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="#8ea8ff" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="#e4a0ff" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
      </Environment>

      {/*
        The bloom pass is what turns the accent halo and specular highlights
        into real, soft glow — the "made in Spline" look. Gated by tier
        (config.bloom) so weak GPUs skip the most expensive per-frame effect.
        The canvas is alpha:true and the badge occupies the masked pass cell, so
        bloom never touches the deterministic ?e2e=1 visual baseline.
      */}
      {config.bloom ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            mipmapBlur
            intensity={0.7}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.3}
            radius={0.75}
          />
        </EffectComposer>
      ) : null}
    </>
  );
}
