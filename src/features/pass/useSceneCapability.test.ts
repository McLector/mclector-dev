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
    expect(fallbackReason(signals({ hasWebGL: false }))).toBe("no-webgl");
  });

  it("reports a GPU too weak to render the scene", () => {
    expect(fallbackReason(signals({ gpuTier: 0 }))).toBe("low-tier");
  });

  it("does NOT fall back merely for reduced motion (renders static instead)", () => {
    expect(fallbackReason(signals({ prefersReducedMotion: true }))).toBeNull();
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
    expect(result.current.mode).toBe("fallback");
    expect(result.current.reason).toBe("no-webgl");
    expect(result.current.config).toBeNull();
  });

  it("renders full animated 3D on a capable device with WebGL", () => {
    stubEnvironment({ webgl: true, reducedMotion: false });
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.mode).toBe("full");
    expect(result.current.animated).toBe(true);
    expect(result.current.reason).toBeNull();
    expect(result.current.config?.maxDpr).toBeGreaterThan(0);
  });

  it("renders STATIC 3D (not the 2D fallback) under prefers-reduced-motion", () => {
    stubEnvironment({ webgl: true, reducedMotion: true });
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.mode).toBe("static");
    expect(result.current.animated).toBe(false);
    expect(result.current.config).not.toBeNull();
    expect(result.current.reason).toBeNull();
  });

  it("re-resolves between full and static when reduced-motion changes at runtime", () => {
    stubEnvironment({ webgl: true, reducedMotion: false });
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.mode).toBe("full");

    act(() => {
      for (const listener of listeners) listener({ matches: true });
    });

    expect(result.current.mode).toBe("static");
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
