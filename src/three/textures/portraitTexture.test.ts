import { describe, expect, it } from "vitest";
import { coverCropUV } from "./portraitTexture";

describe("coverCropUV", () => {
  it("crops a ~square photo horizontally into a portrait card", () => {
    // 2048x2021 photo → aspect ~1.01; card aspect 0.8 (portrait)
    const { repeat, offset } = coverCropUV(2048, 2021, 0.8);
    expect(repeat[0]).toBeLessThan(1); // horizontal crop
    expect(repeat[1]).toBe(1);
    expect(offset[0]).toBeGreaterThan(0); // centred inset
    expect(offset[1]).toBe(0);
    // centred: offset is half the cropped amount
    expect(offset[0]).toBeCloseTo((1 - repeat[0]) / 2, 5);
  });

  it("crops a tall photo vertically into a wider target", () => {
    const { repeat, offset } = coverCropUV(1000, 3000, 0.8);
    expect(repeat[1]).toBeLessThan(1); // vertical crop
    expect(repeat[0]).toBe(1);
    expect(offset[1]).toBeGreaterThan(0);
    expect(offset[0]).toBe(0);
  });

  it("leaves an exactly-matching aspect uncropped", () => {
    const { repeat, offset } = coverCropUV(800, 1000, 0.8); // 0.8 aspect
    expect(repeat[0]).toBeCloseTo(1, 5);
    expect(repeat[1]).toBeCloseTo(1, 5);
    expect(offset[0]).toBeCloseTo(0, 5);
    expect(offset[1]).toBeCloseTo(0, 5);
  });
});
