import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fitCamera, fitCameraPitched, ringPoints, type Point3 } from "./fitCamera";
import { CAMERA_PITCH_DEG, FOV, FRAME_MARGIN, hologramFramePoints } from "../sceneDims";

const T = Math.tan((FOV * Math.PI) / 360);

/** Project points through a camera at (0, y, z) looking straight down -z. */
function project(points: readonly Point3[], cam: { y: number; z: number }) {
  let up = -Infinity;
  let down = Infinity;
  let side = 0;
  for (const p of points) {
    const d = cam.z - p.z;
    const v = (p.y - cam.y) / d;
    up = Math.max(up, v);
    down = Math.min(down, v);
    side = Math.max(side, Math.abs(p.x) / d);
  }
  return { up, down: -down, side };
}

describe("ringPoints", () => {
  it("returns `count` points on a horizontal circle of the given radius and height", () => {
    const pts = ringPoints(1.9, -2, 32);
    expect(pts).toHaveLength(32);
    for (const p of pts) {
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(1.9, 9);
      expect(p.y).toBe(-2);
    }
  });

  it("defaults to 64 points", () => {
    expect(ringPoints(1, 0)).toHaveLength(64);
  });
});

describe("fitCamera", () => {
  const tall: Point3[] = [
    ...ringPoints(1.9, -2),
    ...ringPoints(1.1, 3),
  ];

  it("centres the vertical extent (top and bottom clearances match)", () => {
    const cam = fitCamera(tall, FOV, 0.9, 0.06);
    const { up, down } = project(tall, cam);
    expect(Math.abs(up - down)).toBeLessThan(1e-4);
  });

  it("fits every point inside the margin-reduced frame on both axes", () => {
    const aspect = 0.9;
    const margin = 0.06;
    const cam = fitCamera(tall, FOV, aspect, margin);
    const { up, down, side } = project(tall, cam);
    const vLimit = T * (1 - margin);
    const hLimit = T * aspect * (1 - margin);
    expect(Math.max(up, down)).toBeLessThanOrEqual(vLimit + 1e-6);
    expect(side).toBeLessThanOrEqual(hLimit + 1e-6);
  });

  it("is tight: the camera is no farther than needed (one axis touches its limit)", () => {
    const aspect = 0.9;
    const margin = 0.06;
    const cam = fitCamera(tall, FOV, aspect, margin);
    const { up, down, side } = project(tall, cam);
    const vSlack = T * (1 - margin) - Math.max(up, down);
    const hSlack = T * aspect * (1 - margin) - side;
    expect(Math.min(vSlack, hSlack)).toBeLessThan(1e-3);
  });

  it("is bound by width on a narrow canvas and by height on a wide one", () => {
    const wide = ringPoints(1.9, 0); // wide, flat
    const narrowCam = fitCamera(wide, FOV, 0.4, 0.05);
    const narrow = project(wide, narrowCam);
    expect(T * 0.4 * 0.95 - narrow.side).toBeLessThan(1e-3); // width touches the limit

    // Once height binds, a wider canvas does not move the camera any further.
    const a = fitCamera(tall, FOV, 3, 0.05);
    const b = fitCamera(tall, FOV, 6, 0.05);
    expect(a.z).toBeCloseTo(b.z, 6);
  });

  it("moves the camera back as the margin grows", () => {
    const tight = fitCamera(tall, FOV, 0.9, 0.02);
    const loose = fitCamera(tall, FOV, 0.9, 0.2);
    expect(loose.z).toBeGreaterThan(tight.z);
  });

  it("accounts for perspective: a near rim needs more distance than flat maths says", () => {
    // A ring's nearest points are closer to the camera than its centre, so they
    // project larger. The naive width-only distance ignores that.
    const aspect = 0.8;
    const margin = 0.06;
    const naive = 1.9 / (T * aspect * (1 - margin));
    const cam = fitCamera(ringPoints(1.9, 0), FOV, aspect, margin);
    expect(cam.z).toBeGreaterThan(naive);
  });

  it("keeps the camera in front of every point", () => {
    const cam = fitCamera(tall, FOV, 0.9, 0.06);
    expect(cam.z).toBeGreaterThan(Math.max(...tall.map((p) => p.z)));
  });

  it("is deterministic", () => {
    expect(fitCamera(tall, FOV, 0.9, 0.06)).toEqual(fitCamera(tall, FOV, 0.9, 0.06));
  });

  it("handles a single point without producing NaN", () => {
    const cam = fitCamera([{ x: 0, y: 0, z: 0 }], FOV, 1, 0.06);
    expect(Number.isFinite(cam.y)).toBe(true);
    expect(Number.isFinite(cam.z)).toBe(true);
    expect(cam.z).toBeGreaterThan(0);
  });

  describe("rejects invalid input", () => {
    const pts: Point3[] = [{ x: 1, y: 1, z: 0 }];
    it("no points", () => {
      expect(() => fitCamera([], FOV, 1, 0.06)).toThrow(/no points/i);
    });
    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("aspect %s", (aspect) => {
      expect(() => fitCamera(pts, FOV, aspect, 0.06)).toThrow(RangeError);
    });
    it.each([-0.1, 1, 1.5, Number.NaN])("margin %s", (margin) => {
      expect(() => fitCamera(pts, FOV, 1, margin)).toThrow(RangeError);
    });
    it.each([0, 180, -10, Number.NaN])("fov %s", (fov) => {
      expect(() => fitCamera(pts, fov, 1, 0.06)).toThrow(RangeError);
    });
  });
});

describe("hologram framing (pinned to the approved mockup)", () => {
  // The mockup measured a 546×596 canvas and fitted the camera to y=-0.12, z=8.73.
  it("reproduces the mockup's camera for its canvas", () => {
    const cam = fitCamera(hologramFramePoints(), FOV, 546 / 596, FRAME_MARGIN);
    expect(cam.y).toBeCloseTo(-0.12, 2);
    expect(cam.z).toBeCloseTo(8.73, 1);
  });

  it("keeps the whole object inside the frame on the design canvas and a narrow one", () => {
    for (const aspect of [546 / 596, 0.6, 1.4]) {
      const pts = hologramFramePoints();
      const cam = fitCamera(pts, FOV, aspect, FRAME_MARGIN);
      const { up, down, side } = project(pts, cam);
      expect(Math.max(up, down)).toBeLessThanOrEqual(T * (1 - FRAME_MARGIN) + 1e-6);
      expect(side).toBeLessThanOrEqual(T * aspect * (1 - FRAME_MARGIN) + 1e-6);
    }
  });

  it("includes the card's float (bob) at the top and the pedestal at the bottom", () => {
    const ys = hologramFramePoints().map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(0.55 + 0.05 + (2.45 + 0.17) / 2 + 0.03, 6);
    expect(Math.min(...ys)).toBeCloseTo(-1.9 - 0.06, 6);
  });
});

describe("fitCameraPitched", () => {
  const DESIGN = 546 / 596;
  const pts = hologramFramePoints();

  /** A real perspective camera at the fit, so the check does not trust the fit's own maths. */
  function cameraFor(fit: ReturnType<typeof fitCameraPitched>, aspect: number) {
    const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 200);
    cam.position.set(fit.position.x, fit.position.y, fit.position.z);
    cam.lookAt(fit.lookAt.x, fit.lookAt.y, fit.lookAt.z);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    return cam;
  }

  /** The largest |x| and |y| of any point in normalised device coordinates (1 = the frame's edge). */
  function ndcExtent(points: readonly Point3[], cam: THREE.PerspectiveCamera) {
    const v = new THREE.Vector3();
    let x = 0;
    let y = 0;
    for (const p of points) {
      v.set(p.x, p.y, p.z).project(cam);
      x = Math.max(x, Math.abs(v.x));
      y = Math.max(y, Math.abs(v.y));
    }
    return { x, y };
  }

  it("at pitch 0 is exactly the level fit (same camera as fitCamera, looking straight down -z)", () => {
    const level = fitCamera(pts, FOV, DESIGN, FRAME_MARGIN);
    const fit = fitCameraPitched(pts, FOV, DESIGN, FRAME_MARGIN, 0);
    expect(fit.position.x).toBeCloseTo(0, 9);
    expect(fit.position.y).toBeCloseTo(level.y, 9);
    expect(fit.position.z).toBeCloseTo(level.z, 9);
    expect(fit.lookAt.y).toBeCloseTo(level.y, 9);
    expect(fit.lookAt.z).toBeLessThan(fit.position.z);
    expect(fit.distance).toBeCloseTo(level.z, 9);
  });

  it.each([6, CAMERA_PITCH_DEG, 25, 40])(
    "keeps every point inside the frame, margin included, at %s degrees and any canvas shape",
    (pitch) => {
      for (const aspect of [DESIGN, 0.6, 1.4]) {
        const e = ndcExtent(pts, cameraFor(fitCameraPitched(pts, FOV, aspect, FRAME_MARGIN, pitch), aspect));
        expect(e.x).toBeLessThanOrEqual(1 - FRAME_MARGIN + 1e-6);
        expect(e.y).toBeLessThanOrEqual(1 - FRAME_MARGIN + 1e-6);
      }
    },
  );

  it("is a TIGHT fit: the nearest camera, so some point sits on the margin", () => {
    const fit = fitCameraPitched(pts, FOV, DESIGN, FRAME_MARGIN, CAMERA_PITCH_DEG);
    const e = ndcExtent(pts, cameraFor(fit, DESIGN));
    expect(Math.max(e.x, e.y)).toBeGreaterThan(1 - FRAME_MARGIN - 1e-3);
  });

  it("looks down at the stated angle from above the target", () => {
    const fit = fitCameraPitched(pts, FOV, DESIGN, FRAME_MARGIN, 12);
    const f = new THREE.Vector3(
      fit.lookAt.x - fit.position.x,
      fit.lookAt.y - fit.position.y,
      fit.lookAt.z - fit.position.z,
    ).normalize();
    expect(f.x).toBeCloseTo(0, 9);
    expect(f.y).toBeCloseTo(-Math.sin((12 * Math.PI) / 180), 9);
    expect(f.z).toBeCloseTo(-Math.cos((12 * Math.PI) / 180), 9);
  });

  it("stays on the axis: a symmetric object never makes the camera drift sideways", () => {
    expect(fitCameraPitched(pts, FOV, DESIGN, FRAME_MARGIN, 25).position.x).toBeCloseTo(0, 9);
  });

  it("never needs a closer camera as the pitch grows (the floor ring takes more of the frame)", () => {
    let last = 0;
    for (const pitch of [0, 6, 12, 25, 40]) {
      const { distance } = fitCameraPitched(pts, FOV, DESIGN, FRAME_MARGIN, pitch);
      expect(distance).toBeGreaterThanOrEqual(last - 1e-9);
      last = distance;
    }
  });

  it("is deterministic", () => {
    expect(fitCameraPitched(pts, FOV, DESIGN, FRAME_MARGIN, 12)).toEqual(
      fitCameraPitched(pts, FOV, DESIGN, FRAME_MARGIN, 12),
    );
  });

  describe("rejects bad input", () => {
    it("an empty point list", () => {
      expect(() => fitCameraPitched([], FOV, 1, 0.06, 12)).toThrow(/no points/i);
    });
    it.each([Number.NaN, Infinity, -Infinity, 90, -90, 120])("a pitch of %s degrees", (pitch) => {
      expect(() => fitCameraPitched(pts, FOV, 1, 0.06, pitch)).toThrow(RangeError);
    });
    it("a bad aspect, margin or fov, exactly as the level fit does", () => {
      expect(() => fitCameraPitched(pts, FOV, 0, 0.06, 12)).toThrow(RangeError);
      expect(() => fitCameraPitched(pts, FOV, 1, 1, 12)).toThrow(RangeError);
      expect(() => fitCameraPitched(pts, 180, 1, 0.06, 12)).toThrow(RangeError);
    });
  });

  it("the site's slight tilt is 12 degrees, and keeps the hologram on every common canvas shape", () => {
    expect(CAMERA_PITCH_DEG).toBe(12);
    for (const aspect of [546 / 596, 0.5, 0.9, 1.2, 1.78]) {
      const e = ndcExtent(pts, cameraFor(fitCameraPitched(pts, FOV, aspect, FRAME_MARGIN, CAMERA_PITCH_DEG), aspect));
      expect(Math.max(e.x, e.y)).toBeLessThanOrEqual(1 - FRAME_MARGIN + 1e-6);
    }
  });
});
