/**
 * Pointer → world-space drag maths for the lanyard card.
 *
 * Deliberately free of React, react-three-fiber and Rapier imports: plain
 * `three` only, so it is a pure unit that can be exercised without a GPU,
 * a renderer or a physics world. See `dragPlane.test.ts`.
 *
 * The technique: while the card is dragged we do not raycast against the
 * card (it moves, and the hit would feed back into itself). Instead we
 * define a plane through the card's current position whose normal is the
 * camera's forward axis — a "screen-parallel" plane at the card's depth —
 * and intersect the pointer ray with it. The card therefore tracks the
 * cursor exactly while keeping the depth it was grabbed at.
 */
import * as THREE from "three";

/** Pointer in normalized device coordinates: x,y ∈ [-1, 1], y up. */
export type PointerNdc = { x: number; y: number };

const _raycaster = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _normal = new THREE.Vector3();
const _pointer = new THREE.Vector2();
const _hit = new THREE.Vector3();

function clampNdc(value: number): number {
  if (!Number.isFinite(value)) return NaN;
  return Math.min(1, Math.max(-1, value));
}

/**
 * The world-space forward axis of `camera` — the normal of the drag plane.
 * Writes into `target` when supplied.
 */
export function dragPlaneNormal(
  camera: THREE.Camera,
  target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  return camera.getWorldDirection(target);
}

/**
 * World-space point the card should be moved to for a given pointer.
 *
 * @param camera       the scene camera (perspective or orthographic)
 * @param pointer      pointer in NDC; values outside [-1,1] are clamped so a
 *                     pointer dragged off-canvas does not fling the card
 * @param planePoint   a point the drag plane passes through — in practice the
 *                     card's position at grab time, i.e. its depth
 * @param grabOffset   optional world-space offset added to the hit, so the
 *                     card keeps the relative grip it was picked up with
 * @param target       optional out-parameter to avoid an allocation per frame
 *
 * Degenerate inputs (non-finite pointer, camera sitting on the plane, a ray
 * parallel to the plane) resolve to `planePoint` rather than NaN — a frozen
 * card is recoverable, a NaN transform poisons the whole Rapier world.
 */
export function computeDragTarget(
  camera: THREE.Camera,
  pointer: PointerNdc,
  planePoint: THREE.Vector3,
  grabOffset?: THREE.Vector3 | null,
  target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  const nx = clampNdc(pointer.x);
  const ny = clampNdc(pointer.y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
    return target.copy(planePoint);
  }

  dragPlaneNormal(camera, _normal);
  if (_normal.lengthSq() === 0) return target.copy(planePoint);
  _plane.setFromNormalAndCoplanarPoint(_normal, planePoint);

  _pointer.set(nx, ny);
  _raycaster.setFromCamera(_pointer, camera);

  const hit = _raycaster.ray.intersectPlane(_plane, _hit);
  if (!hit || !Number.isFinite(hit.x) || !Number.isFinite(hit.y) || !Number.isFinite(hit.z)) {
    return target.copy(planePoint);
  }

  target.copy(hit);
  if (grabOffset) target.add(grabOffset);
  return target;
}

/**
 * The offset to hand back to {@link computeDragTarget} for the rest of a drag,
 * captured once on pointer-down: `bodyPosition - hitAtGrabTime`. Applying it
 * keeps the card from snapping its centre under the cursor when the user
 * grabs it by a corner.
 */
export function grabOffsetFor(
  camera: THREE.Camera,
  pointer: PointerNdc,
  bodyPosition: THREE.Vector3,
  target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  computeDragTarget(camera, pointer, bodyPosition, null, target);
  return target.subVectors(bodyPosition, target);
}
