import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMotion } from "./useMotion";
import { setMotion } from "./motion";

describe("useMotion", () => {
  const root = document.documentElement;

  beforeEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
  });
  afterEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
  });

  it("starts off, and reports the boot script's on when it put that on <html>", () => {
    expect(renderHook(() => useMotion()).result.current.motion).toBe("off");
    root.setAttribute("data-motion", "on");
    expect(renderHook(() => useMotion()).result.current.motion).toBe("on");
  });

  it("toggle switches the setting, the attribute and the stored choice together", () => {
    const { result } = renderHook(() => useMotion());
    act(() => result.current.toggle());
    expect(result.current.motion).toBe("on");
    expect(root.getAttribute("data-motion")).toBe("on");
    expect(localStorage.getItem("mclector-motion")).toBe("on");
    act(() => result.current.toggle());
    expect(result.current.motion).toBe("off");
  });

  it("follows a change made elsewhere (e.g. another component, or the toggle) — live, no reload", () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.motion).toBe("off");
    act(() => setMotion("on"));
    expect(result.current.motion).toBe("on");
  });

  it("keeps two consumers in sync", () => {
    const a = renderHook(() => useMotion());
    const b = renderHook(() => useMotion());
    act(() => a.result.current.toggle());
    expect(b.result.current.motion).toBe("on");
  });

  it("stops listening after unmount", () => {
    const { result, unmount } = renderHook(() => useMotion());
    unmount();
    // Would throw (state update on an unmounted hook) or leak if the subscription survived.
    act(() => setMotion("on"));
    expect(result.current.motion).toBe("off");
  });
});
