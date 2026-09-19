import { describe, expect, it } from "vitest";
import { fitCamera, ringPoints, type Point3 } from "./fitCamera";
import { FOV, FRAME_MARGIN, hologramFramePoints } from "../sceneDims";

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
