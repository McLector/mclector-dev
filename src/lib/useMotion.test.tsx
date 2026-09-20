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

  it("starts on, and reports the boot script's off when it put that on <html>", () => {
    expect(renderHook(() => useMotion()).result.current.motion).toBe("on");
    root.setAttribute("data-motion", "off");
    expect(renderHook(() => useMotion()).result.current.motion).toBe("off");
  });

  it("toggle switches the setting, the attribute and the stored choice together", () => {
    const { result } = renderHook(() => useMotion());
    act(() => result.current.toggle());
    expect(result.current.motion).toBe("off");
    expect(root.getAttribute("data-motion")).toBe("off");
    expect(localStorage.getItem("mclector-motion")).toBe("off");
    act(() => result.current.toggle());
    expect(result.current.motion).toBe("on");
  });

  it("follows a change made elsewhere (e.g. another component, or the toggle) — live, no reload", () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.motion).toBe("on");
    act(() => setMotion("off"));
    expect(result.current.motion).toBe("off");
  });

  it("keeps two consumers in sync", () => {
    const a = renderHook(() => useMotion());
    const b = renderHook(() => useMotion());
    act(() => a.result.current.toggle());
    expect(b.result.current.motion).toBe("off");
  });

  it("stops listening after unmount", () => {
    const { result, unmount } = renderHook(() => useMotion());
    unmount();
    // Would throw (state update on an unmounted hook) or leak if the subscription survived.
    act(() => setMotion("off"));
    expect(result.current.motion).toBe("on");
  });
});
