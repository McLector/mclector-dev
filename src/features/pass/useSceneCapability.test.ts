import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { CapabilitySignals } from "@/lib/capability";
import { fallbackReason, useSceneCapability } from "./useSceneCapability";

function signals(overrides: Partial<CapabilitySignals> = {}): CapabilitySignals {
  return {
    hasWebGL: true,
    prefersReducedMotion: false,
    devicePixelRatio: 2,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    gpuTier: 3,
    ...overrides,
  };
}

describe("fallbackReason", () => {
  it("is null for a capable device", () => {
    expect(fallbackReason(signals())).toBeNull();
  });

  it("reports missing WebGL before anything else", () => {
    expect(fallbackReason(signals({ hasWebGL: false, prefersReducedMotion: true }))).toBe(
      "no-webgl",
    );
  });

  it("reports reduced motion", () => {
    expect(fallbackReason(signals({ prefersReducedMotion: true }))).toBe("reduced-motion");
  });

  it("reports a GPU too weak to render the scene", () => {
    expect(fallbackReason(signals({ gpuTier: 0 }))).toBe("low-tier");
  });

  it("does not fall back merely for a modest but usable device", () => {
    expect(fallbackReason(signals({ gpuTier: 1, hardwareConcurrency: 2, deviceMemory: 2 }))).toBeNull();
  });
});

describe("useSceneCapability", () => {
  const listeners: Array<(e: { matches: boolean }) => void> = [];

  afterEach(() => {
    listeners.length = 0;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubEnvironment(options: { webgl: boolean; reducedMotion: boolean }) {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => (options.webgl ? ({} as RenderingContext) : null) as never,
    );
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduced-motion") ? options.reducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.push(cb);
      }),
      removeEventListener: vi.fn((_: string, cb: (e: { matches: boolean }) => void) => {
        const index = listeners.indexOf(cb);
        if (index >= 0) listeners.splice(index, 1);
      }),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia;
  }

  it("falls back when jsdom reports no WebGL context", () => {
    stubEnvironment({ webgl: false, reducedMotion: false });
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.tier).toBe("unsupported");
    expect(result.current.reason).toBe("no-webgl");
    expect(result.current.config).toBeNull();
  });

  it("resolves a usable tier and config when WebGL is available", () => {
    stubEnvironment({ webgl: true, reducedMotion: false });
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.tier).not.toBe("unsupported");
    expect(result.current.reason).toBeNull();
    expect(result.current.config?.maxDpr).toBeGreaterThan(0);
  });

  it("falls back under prefers-reduced-motion even with WebGL", () => {
    stubEnvironment({ webgl: true, reducedMotion: true });
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.tier).toBe("unsupported");
    expect(result.current.reason).toBe("reduced-motion");
  });

  it("re-resolves when the reduced-motion preference changes at runtime", () => {
    stubEnvironment({ webgl: true, reducedMotion: false });
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.reason).toBeNull();

    act(() => {
      for (const listener of listeners) listener({ matches: true });
    });

    expect(result.current.reason).toBe("reduced-motion");
  });

  it("detaches its media listener on unmount", () => {
    stubEnvironment({ webgl: true, reducedMotion: false });
    const { unmount } = renderHook(() => useSceneCapability());
    expect(listeners.length).toBeGreaterThan(0);
    unmount();
    expect(listeners.length).toBe(0);
  });

  it("caps DPR at the tier's ceiling rather than the device's raw value", () => {
    stubEnvironment({ webgl: true, reducedMotion: false });
    const { result } = renderHook(() => useSceneCapability());
    const config = result.current.config;
    expect(config).not.toBeNull();
    expect(result.current.dpr).toBeLessThanOrEqual(config!.maxDpr);
    expect(result.current.dpr).toBeGreaterThan(0);
  });
});
