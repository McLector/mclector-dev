import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// jsdom has no matchMedia — every stream that checks prefers-reduced-motion
// or a breakpoint needs this. Defaults to "no match"; individual tests
// override with vi.stubGlobal or by re-mocking matches.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom's canvas has no real 2D/WebGL context. Individual tests that need
// canvas behaviour (e.g. badge texture painting) stub getContext themselves
// with a fake recorder; this default keeps components that merely *check*
// for WebGL support (capability detection) from throwing.
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}

// IntersectionObserver is used by the capability/visibility gating around
// the 3D canvas; jsdom does not implement it.
if (!("IntersectionObserver" in window)) {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    disconnect(): void {}
    observe(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve(): void {}
  }
  // @ts-expect-error -- test-environment polyfill
  window.IntersectionObserver = MockIntersectionObserver;
}

// ResizeObserver — used by responsive layout hooks; not in jsdom.
if (!("ResizeObserver" in window)) {
  class MockResizeObserver implements ResizeObserver {
    disconnect(): void {}
    observe(): void {}
    unobserve(): void {}
  }
  // @ts-expect-error -- test-environment polyfill
  window.ResizeObserver = MockResizeObserver;
}
