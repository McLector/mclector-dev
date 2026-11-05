import { describe, expect, it } from "vitest";
import { DEP, PH, PW } from "./sceneDims";
import { BRACKET, FACE_Z, FZ, bracketCorners } from "./cardFrame";

/**
 * The card is now just two photo faces and four corner brackets: no bezel, rim or glint. These pin the
 * z-stack of the two-sided card and the bracket geometry, which were the approved mock-up's (C3 "Corners only").
 */

describe("face z-stack (two-sided card)", () => {
  it("FZ is half the slab depth", () => {
    expect(FZ).toBeCloseTo(DEP / 2, 10);
  });

  it("separates the two screens by 0.03, mirrored about the middle", () => {
    expect(2 * FACE_Z.screen).toBeCloseTo(0.03, 10);
  });

  it("keeps the brackets in FRONT of the photo, clear of it, so they never z-fight with it", () => {
    expect(FACE_Z.bracket).toBeGreaterThan(FACE_Z.screen);
    expect(FACE_Z.bracket - FACE_Z.screen).toBeGreaterThanOrEqual(0.01);
  });

  it("has dropped every layer the bezel needed", () => {
    expect(Object.keys(FACE_Z).sort()).toEqual(["bracket", "screen"]);
  });
});

describe("bracketCorners", () => {
  const corners = bracketCorners();

  it("is one polyline per corner: four, each of three points", () => {
    expect(corners).toHaveLength(4);
    for (const c of corners) expect(c).toHaveLength(3);
  });

  it("frames the picture just outside its edge (the picture is PW × PH)", () => {
    expect(BRACKET.halfW).toBeCloseTo((PW + 0.06) / 2, 10);
    expect(BRACKET.halfH).toBeCloseTo((PH + 0.06) / 2, 10);
    expect(BRACKET.halfW).toBeGreaterThan(PW / 2);
    expect(BRACKET.halfH).toBeGreaterThan(PH / 2);
  });

  it("bends exactly at each corner of the frame, with both legs pointing inward", () => {
    for (const [a, corner, b] of corners) {
      expect(Math.abs(corner.x)).toBeCloseTo(BRACKET.halfW, 10);
      expect(Math.abs(corner.y)).toBeCloseTo(BRACKET.halfH, 10);
      // the first leg runs along the vertical edge, the second along the horizontal edge
      expect(a.x).toBeCloseTo(corner.x, 10);
      expect(Math.abs(a.y)).toBeLessThan(Math.abs(corner.y));
      expect(b.y).toBeCloseTo(corner.y, 10);
      expect(Math.abs(b.x)).toBeLessThan(Math.abs(corner.x));
    }
  });

  it("gives every leg the bracket length, and covers all four quadrants once each", () => {
    for (const [a, corner, b] of corners) {
      expect(Math.abs(a.y - corner.y)).toBeCloseTo(BRACKET.length, 10);
      expect(Math.abs(b.x - corner.x)).toBeCloseTo(BRACKET.length, 10);
    }
    const quadrants = new Set(corners.map(([, c]) => `${Math.sign(c.x)},${Math.sign(c.y)}`));
    expect(quadrants.size).toBe(4);
  });

  it("keeps each bracket short enough never to meet its neighbour along an edge", () => {
    expect(BRACKET.length).toBeLessThan(BRACKET.halfW);
    expect(BRACKET.length).toBeLessThan(BRACKET.halfH);
  });

  it("is bright but not full: a crisp line, opacity in (0, 1)", () => {
    expect(BRACKET.opacity).toBeGreaterThan(0);
    expect(BRACKET.opacity).toBeLessThan(1);
  });
});
