import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  computeDragTarget,
  dragPlaneNormal,
  grabOffsetFor,
  type PointerNdc,
} from "./dragPlane";

/** A perspective camera looking at the origin from +z, matrices up to date. */
function frontCamera(distance = 5): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

const CENTER: PointerNdc = { x: 0, y: 0 };

describe("dragPlaneNormal", () => {
  it("is the camera's forward axis in world space", () => {
    const camera = frontCamera();
    const n = dragPlaneNormal(camera);
    // Camera at +z looking at origin → forward is -z.
    expect(n.x).toBeCloseTo(0, 6);
    expect(n.y).toBeCloseTo(0, 6);
    expect(n.z).toBeCloseTo(-1, 6);
    expect(n.length()).toBeCloseTo(1, 6);
  });

  it("follows a rotated camera", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const n = dragPlaneNormal(camera);
    expect(n.x).toBeCloseTo(-1, 6);
    expect(n.z).toBeCloseTo(0, 6);
  });

  it("writes into a provided target instead of allocating", () => {
    const camera = frontCamera();
    const target = new THREE.Vector3(9, 9, 9);
    const n = dragPlaneNormal(camera, target);
    expect(n).toBe(target);
    expect(n.z).toBeCloseTo(-1, 6);
  });
});

describe("computeDragTarget", () => {
  it("maps a centred pointer onto the plane point itself", () => {
    const camera = frontCamera();
    const anchor = new THREE.Vector3(0, 0, 0);
    const out = computeDragTarget(camera, CENTER, anchor);
    expect(out.x).toBeCloseTo(0, 5);
    expect(out.y).toBeCloseTo(0, 5);
    expect(out.z).toBeCloseTo(0, 5);
  });

  it("keeps the card at its original depth regardless of pointer position", () => {
    const camera = frontCamera();
    const anchor = new THREE.Vector3(0, 0, -2);
    for (const p of [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 0.4, y: -0.9 },
    ]) {
      const out = computeDragTarget(camera, p, anchor);
      expect(out.z).toBeCloseTo(-2, 5);
    }
  });

  it("puts each NDC corner in the matching world quadrant", () => {
    const camera = frontCamera();
    const anchor = new THREE.Vector3(0, 0, 0);

    const topRight = computeDragTarget(camera, { x: 1, y: 1 }, anchor);
    expect(topRight.x).toBeGreaterThan(0);
    expect(topRight.y).toBeGreaterThan(0);

    const bottomLeft = computeDragTarget(camera, { x: -1, y: -1 }, anchor);
    expect(bottomLeft.x).toBeLessThan(0);
    expect(bottomLeft.y).toBeLessThan(0);

    // NDC is symmetric about the centre, so the two corners mirror.
    expect(bottomLeft.x).toBeCloseTo(-topRight.x, 5);
    expect(bottomLeft.y).toBeCloseTo(-topRight.y, 5);
  });

  it("scales with distance — a farther plane covers more world space", () => {
    const camera = frontCamera(5);
    const near = computeDragTarget(camera, { x: 1, y: 0 }, new THREE.Vector3(0, 0, 4));
    const far = computeDragTarget(camera, { x: 1, y: 0 }, new THREE.Vector3(0, 0, -5));
    expect(Math.abs(far.x)).toBeGreaterThan(Math.abs(near.x));
  });

  it("respects a camera moved and rotated onto the +x axis", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const anchor = new THREE.Vector3(0, 0, 0);
    const centred = computeDragTarget(camera, CENTER, anchor);
    expect(centred.x).toBeCloseTo(0, 5);
    expect(centred.y).toBeCloseTo(0, 5);
    expect(centred.z).toBeCloseTo(0, 5);

    // Moving the pointer right now sweeps along -z, not +x.
    const right = computeDragTarget(camera, { x: 1, y: 0 }, anchor);
    expect(right.x).toBeCloseTo(0, 4);
    expect(Math.abs(right.z)).toBeGreaterThan(0.1);
  });

  it("works with an orthographic camera", () => {
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    const anchor = new THREE.Vector3(0, 0, 0);
    expect(computeDragTarget(camera, CENTER, anchor).x).toBeCloseTo(0, 5);
    const right = computeDragTarget(camera, { x: 1, y: 0 }, anchor);
    expect(right.x).toBeCloseTo(2, 4);
    expect(right.z).toBeCloseTo(0, 4);
  });

  it("adds the grab offset so the card does not snap its centre to the cursor", () => {
    const camera = frontCamera();
    const anchor = new THREE.Vector3(0, 0, 0);
    const offset = new THREE.Vector3(0, 0.5, 0);
    const withOffset = computeDragTarget(camera, CENTER, anchor, offset);
    expect(withOffset.y).toBeCloseTo(0.5, 5);
  });

  // --- Edge cases -------------------------------------------------------

  it("returns the anchor unchanged when the camera sits exactly on the plane point", () => {
    const camera = frontCamera(0); // camera.position === anchor
    const anchor = new THREE.Vector3(0, 0, 0);
    const out = computeDragTarget(camera, { x: 0.7, y: -0.3 }, anchor);
    expect(out.x).toBeCloseTo(0, 6);
    expect(out.y).toBeCloseTo(0, 6);
    expect(out.z).toBeCloseTo(0, 6);
    expect(Number.isFinite(out.x)).toBe(true);
  });

  it("never produces NaN for a non-finite pointer", () => {
    const camera = frontCamera();
    const anchor = new THREE.Vector3(1, 2, 3);
    const out = computeDragTarget(camera, { x: NaN, y: 0 }, anchor);
    expect(out.toArray().every(Number.isFinite)).toBe(true);
    expect(out.toArray()).toEqual([1, 2, 3]);
  });

  it("clamps a pointer beyond the NDC cube rather than extrapolating wildly", () => {
    const camera = frontCamera();
    const anchor = new THREE.Vector3(0, 0, 0);
    const edge = computeDragTarget(camera, { x: 1, y: 0 }, anchor);
    const beyond = computeDragTarget(camera, { x: 40, y: 0 }, anchor);
    expect(beyond.x).toBeCloseTo(edge.x, 5);
  });

  it("does not mutate the anchor it is given", () => {
    const camera = frontCamera();
    const anchor = new THREE.Vector3(0, 0, -2);
    computeDragTarget(camera, { x: 1, y: 1 }, anchor);
    expect(anchor.toArray()).toEqual([0, 0, -2]);
  });

  it("writes into a provided target and returns that same instance", () => {
    const camera = frontCamera();
    const target = new THREE.Vector3();
    const out = computeDragTarget(camera, CENTER, new THREE.Vector3(), undefined, target);
    expect(out).toBe(target);
  });
});

describe("grabOffsetFor", () => {
  it("is the vector that, re-applied, reproduces the original body position", () => {
    const camera = frontCamera();
    const bodyPosition = new THREE.Vector3(0.3, -0.2, 0);
    const pointer: PointerNdc = { x: 0.2, y: 0.1 };

    const offset = grabOffsetFor(camera, pointer, bodyPosition);
    const target = computeDragTarget(camera, pointer, bodyPosition, offset);

    expect(target.x).toBeCloseTo(bodyPosition.x, 5);
    expect(target.y).toBeCloseTo(bodyPosition.y, 5);
    expect(target.z).toBeCloseTo(bodyPosition.z, 5);
  });

  it("is zero when the pointer is already over the body centre", () => {
    const camera = frontCamera();
    const bodyPosition = new THREE.Vector3(0, 0, 0);
    const offset = grabOffsetFor(camera, CENTER, bodyPosition);
    expect(offset.length()).toBeCloseTo(0, 5);
  });
});
