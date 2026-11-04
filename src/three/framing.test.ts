import { describe, expect, it } from "vitest";
import { BACK_FRAMING, FRONT_FRAMING, PH, PW } from "./sceneDims";
import { focalCropUV } from "./textures/portraitTexture";

const CARD_ASPECT = PW / PH;

describe("portrait framing on the card", () => {
  it("shows the formal portrait's FULL height: head to tie, nothing trimmed top or bottom", () => {
    // formal-pic.webp is square. The crop is now really applied, so a zoom above 1 would cut it.
    const { repeat, offset } = focalCropUV(512, 512, CARD_ASPECT, BACK_FRAMING.zoom, BACK_FRAMING.focusX, BACK_FRAMING.focusY);
    expect(repeat[1]).toBeCloseTo(1, 5);
    expect(offset[1]).toBeCloseTo(0, 5);
  });

  it("only trims the formal portrait's sides, and symmetrically, so the face stays centred", () => {
    const { repeat, offset } = focalCropUV(512, 512, CARD_ASPECT, BACK_FRAMING.zoom, BACK_FRAMING.focusX, BACK_FRAMING.focusY);
    expect(repeat[0]).toBeGreaterThan(0.75);
    expect(offset[0]).toBeCloseTo((1 - repeat[0]) / 2, 5);
  });

  it("shows the front photo's FULL height too (it is 2048x2021): no zoom-in crop", () => {
    const { repeat, offset } = focalCropUV(2048, 2021, CARD_ASPECT, FRONT_FRAMING.zoom, FRONT_FRAMING.focusX, FRONT_FRAMING.focusY);
    expect(repeat[1]).toBeCloseTo(1, 5);
    expect(offset[1]).toBeCloseTo(0, 5);
  });

  it("keeps the front subject on the card's midline: the side trim is within a few percent of even", () => {
    const { repeat, offset } = focalCropUV(2048, 2021, CARD_ASPECT, FRONT_FRAMING.zoom, FRONT_FRAMING.focusX, FRONT_FRAMING.focusY);
    const left = offset[0];
    const right = 1 - repeat[0] - offset[0];
    expect(Math.abs(left - right)).toBeLessThan(0.03);
  });
});
