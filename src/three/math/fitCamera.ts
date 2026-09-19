/**
 * Perspective-aware camera framing.
 *
 * Given the 3D points that must stay on screen, find the camera `(0, y, z)` —
 * looking straight down −z, no pitch — that centres them vertically and sits at
 * the smallest distance where they all fit inside the frame with a margin, on
 * BOTH axes.
 *
 * It projects the real points through the perspective camera rather than doing
 * flat height/width maths, because depth matters: the near rim of the pedestal
 * is ~1.9 units closer to the camera than its centre, so it projects far larger
 * than its radius suggests. Flat maths under-frames it.
 *
 * Pure and dependency-free so it is unit-testable (src/three/** is not excluded
 * from Vitest — only the WebGL scene itself is impractical to test).
 */

export type Point3 = { x: number; y: number; z: number };
export type CameraFit = { y: number; z: number };

/** `count` points evenly spaced on a horizontal circle of `radius` at height `y`. */
export function ringPoints(radius: number, y: number, count = 64): Point3[] {
  const pts: Point3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * radius, y, z: Math.sin(a) * radius });
  }
  return pts;
}

const ITERATIONS = 60;

export function fitCamera(
  points: readonly Point3[],
  fovDeg: number,
  aspect: number,
  margin: number,
): CameraFit {
  if (points.length === 0) throw new RangeError("fitCamera: no points to frame");
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError(`fitCamera: aspect must be a positive finite number, got ${aspect}`);
  }
  if (!Number.isFinite(margin) || margin < 0 || margin >= 1) {
    throw new RangeError(`fitCamera: margin must be in [0, 1), got ${margin}`);
  }
  if (!Number.isFinite(fovDeg) || fovDeg <= 0 || fovDeg >= 180) {
    throw new RangeError(`fitCamera: fov must be in (0, 180) degrees, got ${fovDeg}`);
  }

  const T = Math.tan((fovDeg * Math.PI) / 360);
  const limit = 1 - margin;

  let minY = Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    maxZ = Math.max(maxZ, p.z);
  }

  /** Largest upward / downward tangent of any point, from a camera at (0, cy, cz). */
  const vertical = (cz: number, cy: number) => {
    let up = -Infinity;
    let down = Infinity;
    for (const p of points) {
      const v = (p.y - cy) / (cz - p.z);
      if (v > up) up = v;
      if (v < down) down = v;
    }
    return { up, down: -down };
  };

  /** Largest sideways tangent of any point at camera distance cz. */
  const horizontal = (cz: number) => {
    let side = 0;
    for (const p of points) side = Math.max(side, Math.abs(p.x) / (cz - p.z));
    return side;
  };

  /**
   * The camera height that makes the top and bottom clearances equal. Raising
   * the camera shrinks `up` and grows `down`, so up − down is monotone in `cy`.
   */
  const centre = (cz: number) => {
    let lo = minY - 50;
    let hi = maxY + 50;
    for (let i = 0; i < ITERATIONS; i++) {
      const mid = (lo + hi) / 2;
      const { up, down } = vertical(cz, mid);
      if (up - down > 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  // Everything shrinks as the camera moves back, so bisect for the nearest fit.
  let near = maxZ + 0.01; // never at or behind the front-most point
  let far = maxZ + 1e4;
  for (let i = 0; i < ITERATIONS; i++) {
    const cz = (near + far) / 2;
    const { up, down } = vertical(cz, centre(cz));
    const fits =
      up <= T * limit && down <= T * limit && horizontal(cz) <= T * aspect * limit;
    if (fits) far = cz;
    else near = cz;
  }

  return { y: centre(far), z: far };
}
