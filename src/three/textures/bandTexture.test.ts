import { describe, expect, it, vi } from "vitest";
import {
  BAND_TEXTURE_SIZE,
  computeBandSpec,
  drawBandStrip,
  type BandCanvasContext,
} from "./bandTexture";

function makeCtx() {
  let font = "16px sans-serif";
  const gradients: Array<{ args: number[]; stops: Array<[number, string]> }> = [];

  return {
    fillStyle: "" as string | object,
    globalAlpha: 1,
    get font() {
      return font;
    },
    set font(value: string) {
      font = value;
    },
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createLinearGradient: vi.fn((x0: number, y0: number, x1: number, y1: number) => {
      const entry = { args: [x0, y0, x1, y1], stops: [] as Array<[number, string]> };
      gradients.push(entry);
      return {
        addColorStop: vi.fn((offset: number, color: string) => {
          entry.stops.push([offset, color]);
        }),
      };
    }),
    __gradients: gradients,
  };
}

const OPTIONS = {
  ...BAND_TEXTURE_SIZE,
  accentFrom: "#4f7cff",
  accentTo: "#b34fff",
  label: "@McLector",
};

describe("computeBandSpec", () => {
  it("runs its gradient down the strip's long axis", () => {
    const spec = computeBandSpec(OPTIONS);
    expect(spec.gradient.from).toEqual([0, 0]);
    expect(spec.gradient.to).toEqual([0, BAND_TEXTURE_SIZE.height]);
  });

  it("anchors the accent colours at the ends and darkens the middle", () => {
    const spec = computeBandSpec(OPTIONS);
    expect(spec.gradient.stops[0]).toEqual([0, "#4f7cff"]);
    expect(spec.gradient.stops[spec.gradient.stops.length - 1]).toEqual([1, "#b34fff"]);
    expect(spec.gradient.stops.length).toBeGreaterThan(2);
  });

  it("keeps stop offsets sorted and inside [0,1]", () => {
    const spec = computeBandSpec(OPTIONS);
    const offsets = spec.gradient.stops.map(([offset]) => offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    for (const offset of offsets) {
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(1);
    }
  });

  it("repeats the handle along the strip at even spacing", () => {
    const spec = computeBandSpec(OPTIONS);
    expect(spec.labels.length).toBeGreaterThan(1);
    for (const label of spec.labels) {
      expect(label.text).toBe("@McLector");
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeLessThanOrEqual(BAND_TEXTURE_SIZE.height);
    }
    const gaps = spec.labels.slice(1).map((l, i) => l.y - spec.labels[i].y);
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0], 6);
  });

  it("emits no labels for empty or whitespace-only text", () => {
    expect(computeBandSpec({ ...OPTIONS, label: "" }).labels).toEqual([]);
    expect(computeBandSpec({ ...OPTIONS, label: "   " }).labels).toEqual([]);
  });

  it("produces deterministic noise — same seed, same specks", () => {
    const a = computeBandSpec(OPTIONS);
    const b = computeBandSpec(OPTIONS);
    expect(a.noise).toEqual(b.noise);
    expect(a.noise.length).toBeGreaterThan(0);
  });

  it("changes its noise when the seed changes", () => {
    const a = computeBandSpec({ ...OPTIONS, seed: 1 });
    const b = computeBandSpec({ ...OPTIONS, seed: 2 });
    expect(a.noise).not.toEqual(b.noise);
  });

  it("keeps every speck inside the strip", () => {
    const spec = computeBandSpec(OPTIONS);
    for (const speck of spec.noise) {
      expect(speck.x).toBeGreaterThanOrEqual(0);
      expect(speck.x + speck.w).toBeLessThanOrEqual(BAND_TEXTURE_SIZE.width);
      expect(speck.y).toBeGreaterThanOrEqual(0);
      expect(speck.y + speck.h).toBeLessThanOrEqual(BAND_TEXTURE_SIZE.height);
      expect(speck.alpha).toBeGreaterThan(0);
      expect(speck.alpha).toBeLessThanOrEqual(1);
    }
  });

  it("degrades gracefully on a zero-sized strip", () => {
    const spec = computeBandSpec({ ...OPTIONS, width: 0, height: 0 });
    expect(spec.noise).toEqual([]);
    expect(spec.labels).toEqual([]);
    expect(() => drawBandStrip(makeCtx(), spec)).not.toThrow();
  });
});

describe("drawBandStrip", () => {
  it("fills the whole strip with the computed gradient", () => {
    const ctx = makeCtx();
    const spec = computeBandSpec(OPTIONS);
    drawBandStrip(ctx, spec);

    expect(ctx.fillRect).toHaveBeenCalledWith(
      0,
      0,
      BAND_TEXTURE_SIZE.width,
      BAND_TEXTURE_SIZE.height,
    );
    const colors = ctx.__gradients.flatMap((g) => g.stops.map(([, c]) => c));
    expect(colors).toContain("#4f7cff");
    expect(colors).toContain("#b34fff");
  });

  it("draws every repeated label", () => {
    const ctx = makeCtx();
    const spec = computeBandSpec(OPTIONS);
    drawBandStrip(ctx, spec);
    const texts = ctx.fillText.mock.calls.map((call) => String(call[0]));
    expect(texts.filter((t) => t === "@McLector").length).toBe(spec.labels.length);
  });

  it("rotates the lettering so it runs along the strap, and unwinds each time", () => {
    const ctx = makeCtx();
    const spec = computeBandSpec(OPTIONS);
    drawBandStrip(ctx, spec);
    expect(ctx.rotate).toHaveBeenCalled();
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("restores globalAlpha after painting noise", () => {
    const ctx = makeCtx();
    drawBandStrip(ctx, computeBandSpec(OPTIONS));
    expect(ctx.globalAlpha).toBe(1);
  });

  it("accepts a real CanvasRenderingContext2D shape", () => {
    const real = null as unknown as CanvasRenderingContext2D;
    const asBandCtx: BandCanvasContext = real;
    expect(asBandCtx).toBeNull();
  });
});
