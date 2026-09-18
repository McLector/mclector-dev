import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useInView } from "./useInView";

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

const instances: Array<{
  callback: Callback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  options?: IntersectionObserverInit;
}> = [];

function stubObserver() {
  class FakeObserver {
    constructor(callback: Callback, options?: IntersectionObserverInit) {
      instances.push({
        callback,
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        options,
      });
      const self = instances[instances.length - 1];
      this.observe = self.observe;
      this.unobserve = self.unobserve;
      this.disconnect = self.disconnect;
    }
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
}

function attach(ref: (node: Element | null) => void) {
  const node = document.createElement("div");
  act(() => ref(node));
  return node;
}

afterEach(() => {
  instances.length = 0;
  vi.unstubAllGlobals();
});

describe("useInView", () => {
  it("starts out of view", () => {
    stubObserver();
    const { result } = renderHook(() => useInView());
    expect(result.current.inView).toBe(false);
  });

  it("observes the node the ref is attached to", () => {
    stubObserver();
    const { result } = renderHook(() => useInView());
    const node = attach(result.current.ref);
    expect(instances).toHaveLength(1);
    expect(instances[0].observe).toHaveBeenCalledWith(node);
  });

  it("flips to in-view when the observer reports an intersection", () => {
    stubObserver();
    const { result } = renderHook(() => useInView());
    attach(result.current.ref);
    act(() => instances[0].callback([{ isIntersecting: true }]));
    expect(result.current.inView).toBe(true);
  });

  it("flips back out of view when the element scrolls away", () => {
    stubObserver();
    const { result } = renderHook(() => useInView());
    attach(result.current.ref);
    act(() => instances[0].callback([{ isIntersecting: true }]));
    act(() => instances[0].callback([{ isIntersecting: false }]));
    expect(result.current.inView).toBe(false);
  });

  it("latches permanently when `once` is set", () => {
    stubObserver();
    const { result } = renderHook(() => useInView({ once: true }));
    attach(result.current.ref);
    act(() => instances[0].callback([{ isIntersecting: true }]));
    act(() => instances[0].callback([{ isIntersecting: false }]));
    expect(result.current.inView).toBe(true);
    expect(instances[0].disconnect).toHaveBeenCalled();
  });

  it("passes rootMargin through", () => {
    stubObserver();
    const { result } = renderHook(() => useInView({ rootMargin: "300px" }));
    attach(result.current.ref);
    expect(instances[0].options?.rootMargin).toBe("300px");
  });

  it("disconnects when the node is detached", () => {
    stubObserver();
    const { result } = renderHook(() => useInView());
    attach(result.current.ref);
    act(() => result.current.ref(null));
    expect(instances[0].disconnect).toHaveBeenCalled();
  });

  it("disconnects on unmount", () => {
    stubObserver();
    const { result, unmount } = renderHook(() => useInView());
    attach(result.current.ref);
    unmount();
    expect(instances[0].disconnect).toHaveBeenCalled();
  });

  it("assumes in-view when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => useInView());
    attach(result.current.ref);
    expect(result.current.inView).toBe(true);
  });

  it("ignores an empty entries array", () => {
    stubObserver();
    const { result } = renderHook(() => useInView());
    attach(result.current.ref);
    act(() => instances[0].callback([]));
    expect(result.current.inView).toBe(false);
  });
});
