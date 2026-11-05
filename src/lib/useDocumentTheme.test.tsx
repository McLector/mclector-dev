import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDocumentTheme } from "./useDocumentTheme";

/**
 * The live theme as `<html data-theme>` says it, for code that cannot share `useTheme`'s state: the 3D scene
 * lives in its own React root, so it reads the attribute (the same source the CSS uses) instead.
 */
describe("useDocumentTheme", () => {
  const root = document.documentElement;
  const setAttr = (value: string) =>
    act(async () => {
      root.setAttribute("data-theme", value);
      await Promise.resolve(); // MutationObserver callbacks are microtasks
    });

  beforeEach(() => root.removeAttribute("data-theme"));
  afterEach(() => {
    root.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });

  it("reads light and dark from the attribute", () => {
    root.setAttribute("data-theme", "light");
    expect(renderHook(() => useDocumentTheme()).result.current).toBe("light");
    root.setAttribute("data-theme", "dark");
    expect(renderHook(() => useDocumentTheme()).result.current).toBe("dark");
  });

  it("is dark when the attribute is missing, since dark is the default", () => {
    expect(renderHook(() => useDocumentTheme()).result.current).toBe("dark");
  });

  it("is dark for a garbage attribute, never an unknown theme", () => {
    root.setAttribute("data-theme", "banana");
    expect(renderHook(() => useDocumentTheme()).result.current).toBe("dark");
  });

  it("follows the toggle live, in both directions, with no reload", async () => {
    root.setAttribute("data-theme", "dark");
    const { result } = renderHook(() => useDocumentTheme());
    await setAttr("light");
    expect(result.current).toBe("light");
    await setAttr("dark");
    expect(result.current).toBe("dark");
  });

  it("falls back to dark if the attribute is later set to garbage", async () => {
    root.setAttribute("data-theme", "light");
    const { result } = renderHook(() => useDocumentTheme());
    await setAttr("banana");
    expect(result.current).toBe("dark");
  });

  it("stops watching on unmount, so a torn-down scene is never updated", () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const { unmount } = renderHook(() => useDocumentTheme());
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("does not re-render for an unrelated attribute change", async () => {
    root.setAttribute("data-theme", "light");
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useDocumentTheme();
    });
    const before = renders;
    await act(async () => {
      root.setAttribute("data-motion", "on");
      await Promise.resolve();
    });
    root.removeAttribute("data-motion");
    expect(renders).toBe(before);
  });
});
