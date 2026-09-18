import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { parseProjectHash, projectHash, useHashRoute } from "./useHashRoute";

/**
 * Stream E — the `#/project/:id` routing contract (docs/contracts.md).
 *
 * These tests are deliberately paranoid about MALFORMED hashes: the hash is
 * user-editable text in the address bar, so every shape of garbage has to
 * resolve to "no project open" (the grid renders) rather than an error, a
 * throw, or a navigation somewhere unexpected.
 */

/** Wipe the fragment without leaving a stale `#` behind. */
function resetHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

/** Simulate Back/Forward or a hand-edited address bar. */
function navigateExternally(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

beforeEach(resetHash);
afterEach(() => {
  resetHash();
  vi.restoreAllMocks();
});

describe("parseProjectHash", () => {
  it("extracts the slug from a well-formed hash", () => {
    expect(parseProjectHash("#/project/eiyu-system")).toBe("eiyu-system");
  });

  it("tolerates a hash string passed without its leading '#'", () => {
    expect(parseProjectHash("/project/taskbuddy")).toBe("taskbuddy");
  });

  it("URI-decodes the slug", () => {
    expect(parseProjectHash("#/project/caf%C3%A9-app")).toBe("café-app");
  });

  it.each([
    ["an empty string", ""],
    ["a bare hash", "#"],
    ["a trailing-slash hash with no id", "#/project/"],
    ["the route root with no trailing slash", "#/project"],
    ["an unrelated fragment", "#something-else"],
    ["a path-traversal attempt", "#/project/../../etc"],
    ["an encoded path-traversal attempt", "#/project/%2E%2E%2F%2E%2E"],
    ["a nested segment", "#/project/eiyu-system/extra"],
    ["a similar but different route", "#/projects/eiyu-system"],
    ["a broken percent escape", "#/project/%E0%A4%A"],
    ["a whitespace-only id", "#/project/%20%20"],
  ])("resolves %s to null", (_label, hash) => {
    expect(parseProjectHash(hash)).toBeNull();
  });

  it("never throws, whatever it is handed", () => {
    for (const hash of ["#/project/%", "#/project/#", "####", "#/project/%%%"]) {
      expect(() => parseProjectHash(hash)).not.toThrow();
    }
  });
});

describe("projectHash", () => {
  it("builds the frozen `#/project/:id` shape", () => {
    expect(projectHash("stark-rent")).toBe("#/project/stark-rent");
  });

  it("percent-encodes an id so it round-trips through parseProjectHash", () => {
    const id = "café project";
    expect(projectHash(id)).toBe("#/project/caf%C3%A9%20project");
    expect(parseProjectHash(projectHash(id))).toBe(id);
  });
});

describe("useHashRoute", () => {
  it("reports no open project when the page loads without a hash", () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.openProjectId).toBeNull();
  });

  it("reads an already-present hash on first render (deep link)", () => {
    window.location.hash = "#/project/eiyu-system";
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.openProjectId).toBe("eiyu-system");
  });

  it("picks up an externally changed hash via the hashchange listener (Back/Forward)", () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.openProjectId).toBeNull();

    navigateExternally("#/project/eiyu-system");
    expect(result.current.openProjectId).toBe("eiyu-system");

    navigateExternally("#/project/taskbuddy");
    expect(result.current.openProjectId).toBe("taskbuddy");

    navigateExternally("#");
    expect(result.current.openProjectId).toBeNull();
  });

  it("openProject writes the hash and exposes the id", () => {
    const { result } = renderHook(() => useHashRoute());

    act(() => result.current.openProject("stark-rent"));

    expect(window.location.hash).toBe("#/project/stark-rent");
    expect(result.current.openProjectId).toBe("stark-rent");
  });

  it("round-trips a URI-encoded id through openProject", () => {
    const { result } = renderHook(() => useHashRoute());

    act(() => result.current.openProject("üñî-project"));

    expect(window.location.hash).toBe("#/project/%C3%BC%C3%B1%C3%AE-project");
    expect(result.current.openProjectId).toBe("üñî-project");
  });

  it("settles on the LAST of two rapid openProject calls", () => {
    const { result } = renderHook(() => useHashRoute());

    act(() => {
      result.current.openProject("eiyu-system");
      result.current.openProject("taskbuddy");
    });

    expect(result.current.openProjectId).toBe("taskbuddy");
    expect(window.location.hash).toBe("#/project/taskbuddy");
  });

  it("close() clears the hash entirely and reports no open project", () => {
    window.location.hash = "#/project/eiyu-system";
    const { result } = renderHook(() => useHashRoute());

    act(() => result.current.close());

    expect(window.location.hash).toBe("");
    expect(result.current.openProjectId).toBeNull();
  });

  it("close() is a no-op-ish when nothing is open (does not throw)", () => {
    const { result } = renderHook(() => useHashRoute());
    expect(() => act(() => result.current.close())).not.toThrow();
    expect(result.current.openProjectId).toBeNull();
  });

  it("reports null for a malformed hash rather than throwing (grid renders)", () => {
    window.location.hash = "#/project/";
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.openProjectId).toBeNull();
  });

  it("does NOT validate the id against real content — that is the overlay's job", () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current.openProject("totally-made-up"));
    expect(result.current.openProjectId).toBe("totally-made-up");
  });

  it("removes its hashchange listener on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useHashRoute());

    unmount();

    expect(remove).toHaveBeenCalledWith("hashchange", expect.any(Function));
  });

  it("stops reacting to hash changes after unmount", () => {
    const { result, unmount } = renderHook(() => useHashRoute());
    unmount();
    expect(() => navigateExternally("#/project/eiyu-system")).not.toThrow();
    expect(result.current.openProjectId).toBeNull();
  });
});
