import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MOTION,
  MOTION_STORAGE_KEY,
  getMotion,
  initMotion,
  isMotion,
  nextMotion,
  resolveInitialMotion,
  setMotion,
  subscribeMotion,
} from "./motion";

describe("DEFAULT_MOTION", () => {
  it("is off — a first visit is calm; ambient motion is opt-in", () => {
    expect(DEFAULT_MOTION).toBe("off");
  });
});

describe("resolveInitialMotion", () => {
  it("is on only for an explicit stored 'on'", () => {
    expect(resolveInitialMotion("on")).toBe("on");
  });

  it("is off when the visitor chose off, or nothing is stored", () => {
    expect(resolveInitialMotion("off")).toBe("off");
    expect(resolveInitialMotion(null)).toBe("off");
    expect(resolveInitialMotion(undefined)).toBe("off");
  });

  it("ignores a garbage stored value and stays off — a corrupt entry must not switch the motion on", () => {
    expect(resolveInitialMotion("banana")).toBe("off");
    expect(resolveInitialMotion("")).toBe("off");
    // Case matters: only the two exact names are valid choices.
    expect(resolveInitialMotion("ON")).toBe("off");
    expect(resolveInitialMotion(" on")).toBe("off");
  });

  it("takes no OS signal: prefers-reduced-motion is deliberately not an input", () => {
    // The rule is `stored === "on" ? "on" : "off"`. One parameter, and no matchMedia in sight.
    expect(resolveInitialMotion.length).toBe(1);
  });
});

describe("isMotion / nextMotion", () => {
  it("accepts exactly the two names", () => {
    expect(isMotion("on")).toBe(true);
    expect(isMotion("off")).toBe(true);
    expect(isMotion("ON")).toBe(false);
    expect(isMotion(undefined)).toBe(false);
    expect(isMotion(1)).toBe(false);
  });

  it("toggles and round-trips", () => {
    expect(nextMotion("on")).toBe("off");
    expect(nextMotion("off")).toBe("on");
    expect(nextMotion(nextMotion("on"))).toBe("on");
  });
});

describe("the live setting (the <html data-motion> attribute is the single source of truth)", () => {
  const root = document.documentElement;

  beforeEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
  });
  afterEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reads off when the attribute is absent, and off for a garbage attribute", () => {
    expect(getMotion()).toBe("off");
    root.setAttribute("data-motion", "sideways");
    expect(getMotion()).toBe("off");
  });

  it("reads on when the boot script (or a previous setMotion) put on on <html>", () => {
    root.setAttribute("data-motion", "on");
    expect(getMotion()).toBe("on");
  });

  it("setMotion writes the attribute AND persists the choice", () => {
    setMotion("off");
    expect(root.getAttribute("data-motion")).toBe("off");
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe("off");
    setMotion("on");
    expect(root.getAttribute("data-motion")).toBe("on");
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe("on");
  });

  it("does not throw when storage is unavailable (private window, blocked site data)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => setMotion("on")).not.toThrow();
    // The choice still applies for this visit, it just cannot be remembered.
    expect(getMotion()).toBe("on");
  });

  it("notifies subscribers with the new value, once per real change", () => {
    const seen: string[] = [];
    subscribeMotion((m) => seen.push(m));
    setMotion("on");
    setMotion("on"); // no change — nothing to tell anyone
    setMotion("off");
    expect(seen).toEqual(["on", "off"]);
  });

  it("stops notifying after unsubscribe, and other subscribers are unaffected", () => {
    const a: string[] = [];
    const b: string[] = [];
    const offA = subscribeMotion((m) => a.push(m));
    subscribeMotion((m) => b.push(m));
    setMotion("on");
    offA();
    setMotion("off");
    expect(a).toEqual(["on"]);
    expect(b).toEqual(["on", "off"]);
  });

  it("initMotion seeds the attribute from the stored choice when the boot script did not", () => {
    localStorage.setItem(MOTION_STORAGE_KEY, "on");
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("on");
  });

  it("initMotion defaults to off when nothing valid is stored", () => {
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("off");
    root.removeAttribute("data-motion");
    localStorage.setItem(MOTION_STORAGE_KEY, "banana");
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("off");
  });

  it("initMotion leaves a value the boot script already set alone, even if storage disagrees", () => {
    root.setAttribute("data-motion", "on");
    localStorage.setItem(MOTION_STORAGE_KEY, "off");
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("on");
  });

  it("initMotion replaces a garbage attribute", () => {
    root.setAttribute("data-motion", "sideways");
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("off");
  });

  it("never consults the OS reduced-motion setting, even when it is on", () => {
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    expect(getMotion()).toBe("off");
    setMotion("on");
    expect(getMotion()).toBe("on");
    expect(matchMedia).not.toHaveBeenCalled();
  });
});
