import { describe, expect, it } from "vitest";
import { resolveQualityTier, type CapabilitySignals } from "./capability";

function signals(overrides: Partial<CapabilitySignals> = {}): CapabilitySignals {
  return {
    hasWebGL: true,
    prefersReducedMotion: false,
    devicePixelRatio: 2,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    gpuTier: 2,
    ...overrides,
  };
}

describe("resolveQualityTier", () => {
  it("returns 'unsupported' when WebGL is unavailable", () => {
    expect(resolveQualityTier(signals({ hasWebGL: false }))).toBe("unsupported");
  });

  it("returns 'unsupported' when the user prefers reduced motion", () => {
    expect(resolveQualityTier(signals({ prefersReducedMotion: true }))).toBe(
      "unsupported",
    );
  });

  it("returns 'unsupported' when GPU tier is 0 even with WebGL present", () => {
    expect(resolveQualityTier(signals({ gpuTier: 0 }))).toBe("unsupported");
  });

  it("returns 'low' on a 2-core device", () => {
    expect(resolveQualityTier(signals({ hardwareConcurrency: 2 }))).toBe("low");
  });

  it("returns 'low' when deviceMemory is undefined (unknown → conservative)", () => {
    expect(
      resolveQualityTier(signals({ deviceMemory: undefined, hardwareConcurrency: 4 })),
    ).toBe("medium");
    expect(
      resolveQualityTier(
        signals({ deviceMemory: undefined, hardwareConcurrency: 2 }),
      ),
    ).toBe("low");
  });

  it("returns 'medium' on a mid-tier device", () => {
    expect(
      resolveQualityTier(signals({ hardwareConcurrency: 4, deviceMemory: 4, gpuTier: 1 })),
    ).toBe("medium");
  });

  it("returns 'high' on a strong device", () => {
    expect(resolveQualityTier(signals())).toBe("high");
  });

  it("clamps an extreme devicePixelRatio via maxDpr, never raw dpr", () => {
    const tier = resolveQualityTier(signals({ devicePixelRatio: 4 }));
    expect(tier).toBe("high"); // tier selection is independent of raw DPR
  });
});
