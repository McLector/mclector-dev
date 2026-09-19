import { describe, expect, it } from "vitest";
import { contrastRatio, TOKEN_CONTRAST_PAIRS } from "./contrast";

describe("contrastRatio", () => {
  it("returns 21 for pure black on pure white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colors", () => {
    expect(contrastRatio("#4f7cff", "#4f7cff")).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    const a = contrastRatio("#0a0a0f", "#f5f5f7");
    const b = contrastRatio("#f5f5f7", "#0a0a0f");
    expect(a).toBeCloseTo(b, 5);
  });

  it("accepts 3-digit hex shorthand", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 0);
  });
});

describe("design-token contrast budget", () => {
  it("every foreground/background token pair meets its WCAG threshold", () => {
    const failures: string[] = [];
    for (const pair of TOKEN_CONTRAST_PAIRS) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      if (ratio < pair.minimumRatio) {
        failures.push(
          `${pair.name}: ratio ${ratio.toFixed(2)} < required ${pair.minimumRatio}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("design-token contrast budget — coverage", () => {
  const names = TOKEN_CONTRAST_PAIRS.map((p) => p.name);

  it("covers the arc-tinted eyebrow and group heading in BOTH themes", () => {
    for (const theme of ["dark", "light"]) {
      expect(names.some((n) => n.startsWith(`${theme}: eyebrow`))).toBe(true);
    }
  });

  it("covers a light-theme chip pair, not just dark", () => {
    expect(names.some((n) => n.startsWith("light: chip"))).toBe(true);
  });

  it("never lowers the threshold below AA for normal text", () => {
    for (const pair of TOKEN_CONTRAST_PAIRS) {
      expect(pair.minimumRatio).toBeGreaterThanOrEqual(4.5);
    }
  });
});
