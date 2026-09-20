import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { CapabilitySignals } from "@/lib/capability";
import { setMotion } from "@/lib/motion";
import { fallbackReason, useSceneCapability } from "./useSceneCapability";

function signals(overrides: Partial<CapabilitySignals> = {}): CapabilitySignals {
  return {
    hasWebGL: true,
    motionOff: false,
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

  it("does NOT fall back merely because animations are off (renders static instead)", () => {
    expect(fallbackReason(signals({ motionOff: true }))).toBeNull();
  });
});

describe("useSceneCapability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-motion");
    localStorage.clear();
  });

  function stubWebGL(webgl: boolean) {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => (webgl ? ({} as RenderingContext) : null) as never,
    );
  }

  it("falls back when jsdom reports no WebGL context", () => {
    stubWebGL(false);
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.mode).toBe("fallback");
    expect(result.current.reason).toBe("no-webgl");
    expect(result.current.config).toBeNull();
  });

  it("renders full animated 3D on a capable device with WebGL", () => {
    stubWebGL(true);
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.mode).toBe("full");
    expect(result.current.animated).toBe(true);
    expect(result.current.reason).toBeNull();
    expect(result.current.config?.maxDpr).toBeGreaterThan(0);
  });

  it("renders STATIC 3D (not the 2D fallback) when the visitor has switched animations off", () => {
    stubWebGL(true);
    setMotion("off");
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.mode).toBe("static");
    expect(result.current.animated).toBe(false);
    expect(result.current.config).not.toBeNull();
    expect(result.current.reason).toBeNull();
  });

  it("re-resolves between full and static when the toggle changes at runtime — live, no reload", () => {
    stubWebGL(true);
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.mode).toBe("full");

    act(() => setMotion("off"));
    expect(result.current.mode).toBe("static");
    expect(result.current.animated).toBe(false);

    act(() => setMotion("on"));
    expect(result.current.mode).toBe("full");
    expect(result.current.animated).toBe(true);
  });

  it("ignores the OS reduced-motion setting: the hologram spins for a visitor whose OS asks for less motion", () => {
    stubWebGL(true);
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    const { result } = renderHook(() => useSceneCapability());
    expect(result.current.mode).toBe("full");
    expect(result.current.animated).toBe(true);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("caps DPR at the tier's ceiling rather than the device's raw value", () => {
    stubWebGL(true);
    const { result } = renderHook(() => useSceneCapability());
    const config = result.current.config;
    expect(config).not.toBeNull();
    expect(result.current.dpr).toBeLessThanOrEqual(config!.maxDpr);
    expect(result.current.dpr).toBeGreaterThan(0);
  });
});
