import { describe, expect, it } from "vitest";
import { computeFitScale } from "./useFitScale";

describe("computeFitScale", () => {
  it("scales down to fit the limiting (height) dimension", () => {
    // 1366x640 viewport, 1200x730 design, 48 padding → height is the limit
    expect(computeFitScale(1366, 640, 1200, 730, 48)).toBeCloseTo((640 - 48) / 730, 4);
  });

  it("never upscales past 1", () => {
    expect(computeFitScale(4000, 3000, 1200, 730, 48)).toBe(1);
  });

  it("uses the smaller of the width/height ratios", () => {
    // very tall, narrow viewport → width limits
    expect(computeFitScale(900, 2000, 1200, 730, 48)).toBeCloseTo((900 - 48) / 1200, 4);
  });

  it("is defensive against a zero/degenerate viewport", () => {
    expect(computeFitScale(0, 0, 1200, 730, 48)).toBeGreaterThan(0);
  });

  it("defaults the padding when omitted", () => {
    expect(computeFitScale(1248, 778, 1200, 730)).toBeCloseTo(1, 4); // (1248-48)/1200 = 1
  });
});
