import { describe, expect, it, vi } from "vitest";
import {
  BADGE_FACE_SIZE,
  drawBadgeFace,
  fitText,
  initialsFrom,
  type BadgeCanvasContext,
  type BadgeFaceData,
} from "./badgeFaceTexture";

/**
 * A fake 2D context that RECORDS calls. We assert on the call log, never on
 * pixels — pixel-diffing a procedurally painted canvas is exactly the kind of
 * brittle test docs/contracts.md warns against.
 *
 * `measureText` returns a deterministic 0.55em-per-character estimate, which
 * is enough for the truncation logic to be meaningfully exercised.
 */
function makeCtx(options: { withRoundRect?: boolean } = {}) {
  const { withRoundRect = true } = options;
  const gradients: Array<{ args: number[]; stops: Array<[number, string]> }> = [];
  let font = "16px sans-serif";

  const ctx = {
    fillStyle: "" as string | object,
    strokeStyle: "" as string | object,
    lineWidth: 1,
    get font() {
      return font;
    },
    set font(value: string) {
      font = value;
    },
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: "",

    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 0.55 * parsePx(font),
    })),
    createLinearGradient: vi.fn((x0: number, y0: number, x1: number, y1: number) => {
      const entry = { args: [x0, y0, x1, y1], stops: [] as Array<[number, string]> };
      gradients.push(entry);
      return {
        addColorStop: vi.fn((offset: number, color: string) => {
          entry.stops.push([offset, color]);
        }),
      };
    }),
    // Present-but-undefined when disabled, so the fallback path is what is
    // exercised rather than a missing-property type hole.
    roundRect: withRoundRect ? vi.fn() : undefined,
  };

  return Object.assign(ctx, { __gradients: gradients });
}

function parsePx(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  return match ? Number(match[1]) : 16;
}

type FakeCtx = ReturnType<typeof makeCtx>;

/** Every string handed to fillText, in order. */
function drawnText(ctx: FakeCtx): string[] {
  return ctx.fillText.mock.calls.map((call) => String(call[0]));
}

function data(overrides: Partial<BadgeFaceData> = {}): BadgeFaceData {
  return {
    ...BADGE_FACE_SIZE,
    displayName: "Myre Lector",
    title: "Myre Lector",
    subtitle: "CS Student · Mobile Dev",
    idLabel: "DLSL-2026",
    caption: "Digital Pass",
    accentFrom: "#4f7cff",
    accentTo: "#b34fff",
    ...overrides,
  };
}

describe("initialsFrom", () => {
  it("takes the first letter of the first and last word", () => {
    expect(initialsFrom("Myre Lector")).toBe("ML");
    expect(initialsFrom("ada byron king lovelace")).toBe("AL");
  });

  it("takes the first two letters of a single word", () => {
    expect(initialsFrom("Myre")).toBe("MY");
  });

  it("handles a one-character name", () => {
    expect(initialsFrom("M")).toBe("M");
  });

  it("falls back to a placeholder glyph for empty or whitespace input", () => {
    expect(initialsFrom("")).toBe("?");
    expect(initialsFrom("   \t\n ")).toBe("?");
  });

  it("collapses repeated whitespace rather than producing empty words", () => {
    expect(initialsFrom("  Myre    Lector  ")).toBe("ML");
  });

  it("is code-point safe, not code-unit safe", () => {
    expect(initialsFrom("😀 Lector")).toBe("😀L");
  });
});

describe("fitText", () => {
  it("returns short text untouched", () => {
    const ctx = makeCtx();
    ctx.font = "40px sans-serif";
    expect(fitText(ctx, "Myre Lector", 1000)).toBe("Myre Lector");
  });

  it("ellipsises text that does not fit, within the budget", () => {
    const ctx = makeCtx();
    ctx.font = "40px sans-serif";
    const long = "Bartholomew Maximilian Featherstonehaugh III";
    const fitted = fitText(ctx, long, 300);
    expect(fitted).not.toBe(long);
    expect(fitted.endsWith("…")).toBe(true);
    expect(ctx.measureText(fitted).width).toBeLessThanOrEqual(300);
  });

  it("degrades to the ellipsis alone when nothing fits", () => {
    const ctx = makeCtx();
    ctx.font = "40px sans-serif";
    expect(fitText(ctx, "Myre Lector", 1)).toBe("…");
  });

  it("returns an empty string for empty input without measuring", () => {
    const ctx = makeCtx();
    expect(fitText(ctx, "", 300)).toBe("");
  });

  it("does not throw on a non-positive budget", () => {
    const ctx = makeCtx();
    ctx.font = "40px sans-serif";
    expect(() => fitText(ctx, "Myre Lector", 0)).not.toThrow();
    expect(() => fitText(ctx, "Myre Lector", -10)).not.toThrow();
  });
});

describe("drawBadgeFace", () => {
  it("balances every save() with a restore()", () => {
    const ctx = makeCtx();
    drawBadgeFace(ctx, data());
    expect(ctx.save.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.restore.mock.calls.length).toBe(ctx.save.mock.calls.length);
  });

  it("paints an opaque base covering the whole face", () => {
    const ctx = makeCtx();
    drawBadgeFace(ctx, data());
    expect(ctx.fillRect).toHaveBeenCalledWith(
      0,
      0,
      BADGE_FACE_SIZE.width,
      BADGE_FACE_SIZE.height,
    );
  });

  it("builds its background from the supplied accent colours", () => {
    const ctx = makeCtx();
    drawBadgeFace(ctx, data({ accentFrom: "#112233", accentTo: "#445566" }));
    const stops = ctx.__gradients.flatMap((g) => g.stops.map(([, color]) => color));
    expect(stops).toContain("#112233");
    expect(stops).toContain("#445566");
  });

  it("draws the title, subtitle, id label and caption", () => {
    const ctx = makeCtx();
    const d = data();
    drawBadgeFace(ctx, d);
    const texts = drawnText(ctx);
    expect(texts).toContain(d.title);
    expect(texts).toContain(d.subtitle);
    expect(texts).toContain(d.idLabel);
    expect(texts).toContain(d.caption);
  });

  it("keeps every glyph inside the canvas bounds", () => {
    const ctx = makeCtx();
    drawBadgeFace(ctx, data());
    for (const call of ctx.fillText.mock.calls) {
      const x = Number(call[1]);
      const y = Number(call[2]);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(BADGE_FACE_SIZE.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(BADGE_FACE_SIZE.height);
    }
  });

  describe("without an avatar", () => {
    it("never calls drawImage", () => {
      const ctx = makeCtx();
      drawBadgeFace(ctx, data({ avatar: undefined }));
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it("paints a gradient monogram from the initials", () => {
      const ctx = makeCtx();
      drawBadgeFace(ctx, data({ displayName: "Myre Lector", avatar: null }));
      expect(drawnText(ctx)).toContain("ML");
    });

    it("still clips the portrait area to a rounded rect", () => {
      const ctx = makeCtx();
      drawBadgeFace(ctx, data());
      expect(ctx.clip).toHaveBeenCalled();
    });
  });

  describe("with an avatar", () => {
    it("draws the image into the clipped portrait frame", () => {
      const ctx = makeCtx();
      const avatar = { nodeName: "IMG" } as unknown as CanvasImageSource;
      drawBadgeFace(ctx, data({ avatar }));

      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
      const [image, dx, dy, dw, dh] = ctx.drawImage.mock.calls[0];
      expect(image).toBe(avatar);
      expect(dw).toBeGreaterThan(0);
      expect(dh).toBeGreaterThan(0);
      expect(dx).toBeGreaterThanOrEqual(0);
      expect(dy).toBeGreaterThanOrEqual(0);
      expect(ctx.clip).toHaveBeenCalled();
    });

    it("does not also paint the monogram", () => {
      const ctx = makeCtx();
      const avatar = { nodeName: "IMG" } as unknown as CanvasImageSource;
      drawBadgeFace(ctx, data({ avatar }));
      expect(drawnText(ctx)).not.toContain("ML");
    });
  });

  describe("overflow and degenerate content", () => {
    it("ellipsises an absurdly long name instead of overflowing the card", () => {
      const ctx = makeCtx();
      const long = "Bartholomew Maximilian Featherstonehaugh-Wetherby III, Esq.";
      drawBadgeFace(ctx, data({ title: long, displayName: long }));
      const texts = drawnText(ctx);
      expect(texts).not.toContain(long);
      expect(texts.some((t) => t.endsWith("…"))).toBe(true);
    });

    it("ellipsises a long subtitle too", () => {
      const ctx = makeCtx();
      const long = "Computer Science Student, Mobile Developer, Amateur Radio Operator";
      drawBadgeFace(ctx, data({ subtitle: long }));
      expect(drawnText(ctx)).not.toContain(long);
    });

    it("does not throw on an empty display name", () => {
      const ctx = makeCtx();
      expect(() => drawBadgeFace(ctx, data({ displayName: "", title: "" }))).not.toThrow();
      expect(drawnText(ctx)).toContain("?");
    });

    it("does not throw on a whitespace-only display name", () => {
      const ctx = makeCtx();
      expect(() => drawBadgeFace(ctx, data({ displayName: "   " }))).not.toThrow();
    });

    it("does not throw on empty subtitle/id/caption", () => {
      const ctx = makeCtx();
      expect(() =>
        drawBadgeFace(ctx, data({ subtitle: "", idLabel: "", caption: "" })),
      ).not.toThrow();
    });

    it("tolerates a tiny face without producing negative geometry", () => {
      const ctx = makeCtx();
      expect(() => drawBadgeFace(ctx, data({ width: 8, height: 12 }))).not.toThrow();
      for (const call of ctx.fillRect.mock.calls) {
        expect(Number(call[2])).toBeGreaterThanOrEqual(0);
        expect(Number(call[3])).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it("falls back to arcTo when the context has no roundRect", () => {
    const ctx = makeCtx({ withRoundRect: false });
    expect(() => drawBadgeFace(ctx, data())).not.toThrow();
    expect(ctx.arcTo).toHaveBeenCalled();
    expect(ctx.clip).toHaveBeenCalled();
  });

  it("uses roundRect when the context provides it", () => {
    const ctx = makeCtx({ withRoundRect: true });
    drawBadgeFace(ctx, data());
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.arcTo).not.toHaveBeenCalled();
  });

  it("is a pure function of its data — two runs record identical calls", () => {
    const a = makeCtx();
    const b = makeCtx();
    drawBadgeFace(a, data());
    drawBadgeFace(b, data());
    expect(drawnText(a)).toEqual(drawnText(b));
    expect(a.fillRect.mock.calls).toEqual(b.fillRect.mock.calls);
  });

  it("accepts a real CanvasRenderingContext2D shape", () => {
    // Compile-time assertion: the narrow recorder interface must be a true
    // subset of the DOM one, or production code could not pass a real ctx.
    const real = null as unknown as CanvasRenderingContext2D;
    const asBadgeCtx: BadgeCanvasContext = real;
    expect(asBadgeCtx).toBeNull();
  });
});
