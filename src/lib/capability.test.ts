import { describe, expect, it } from "vitest";
import { resolveQualityTier, resolveSceneMode, TIER_CONFIG, type CapabilitySignals } from "./capability";

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

describe("TIER_CONFIG", () => {
  it("enables bloom on medium and high, but never on low", () => {
    // Bloom is the post-processing pass that makes the badge glow. It is the
    // most expensive per-frame effect, so the weakest tier that still renders
    // WebGL must skip it — same policy as `starfield`.
    expect(TIER_CONFIG.low.bloom).toBe(false);
    expect(TIER_CONFIG.medium.bloom).toBe(true);
    expect(TIER_CONFIG.high.bloom).toBe(true);
  });

  it("keeps bloom aligned with the other cost knobs (off exactly when starfield is off)", () => {
    for (const tier of Object.values(TIER_CONFIG)) {
      expect(tier.bloom).toBe(tier.starfield);
    }
  });
});

describe("resolveSceneMode", () => {
  it("renders static (not fallback) under reduced motion", () => {
    expect(resolveSceneMode(signals({ prefersReducedMotion: true }))).toBe("static");
  });

  it("falls back only without WebGL or a usable GPU", () => {
    expect(resolveSceneMode(signals({ hasWebGL: false }))).toBe("fallback");
    expect(resolveSceneMode(signals({ gpuTier: 0 }))).toBe("fallback");
  });

  it("renders static on a very low-end but WebGL-capable device", () => {
    expect(resolveSceneMode(signals({ hardwareConcurrency: 2 }))).toBe("static");
  });

  it("is full on a capable device", () => {
    expect(resolveSceneMode(signals())).toBe("full");
  });
});
