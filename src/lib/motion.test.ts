import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MOTION,
  MOTION_STORAGE_KEY,
  getMotion,
  initMotion,
  isMotion,
  motionOn,
  nextMotion,
  resolveInitialMotion,
  setMotion,
  subscribeMotion,
} from "./motion";

describe("DEFAULT_MOTION", () => {
  it("is on — ambient motion runs for every visitor unless they switch it off", () => {
    expect(DEFAULT_MOTION).toBe("on");
  });
});

describe("resolveInitialMotion", () => {
  it("is off only for an explicit stored 'off'", () => {
    expect(resolveInitialMotion("off")).toBe("off");
  });

  it("is on when the visitor chose on, or nothing is stored", () => {
    expect(resolveInitialMotion("on")).toBe("on");
    expect(resolveInitialMotion(null)).toBe("on");
    expect(resolveInitialMotion(undefined)).toBe("on");
  });

  it("ignores a garbage stored value and stays on — a corrupt entry must not silently freeze the site", () => {
    expect(resolveInitialMotion("banana")).toBe("on");
    expect(resolveInitialMotion("")).toBe("on");
    // Case matters: only the two exact names are valid choices.
    expect(resolveInitialMotion("OFF")).toBe("on");
    expect(resolveInitialMotion(" off")).toBe("on");
  });

  it("takes no OS signal: prefers-reduced-motion is deliberately not an input", () => {
    // The rule is `stored === "off" ? "off" : "on"`. One parameter, and no matchMedia in sight.
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

  it("reads on when the attribute is absent, and on for a garbage attribute", () => {
    expect(getMotion()).toBe("on");
    root.setAttribute("data-motion", "sideways");
    expect(getMotion()).toBe("on");
  });

  it("reads off when the boot script (or a previous setMotion) put off on <html>", () => {
    root.setAttribute("data-motion", "off");
    expect(getMotion()).toBe("off");
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
    expect(() => setMotion("off")).not.toThrow();
    // The choice still applies for this visit, it just cannot be remembered.
    expect(getMotion()).toBe("off");
  });

  it("notifies subscribers with the new value, once per real change", () => {
    const seen: string[] = [];
    subscribeMotion((m) => seen.push(m));
    setMotion("off");
    setMotion("off"); // no change — nothing to tell anyone
    setMotion("on");
    expect(seen).toEqual(["off", "on"]);
  });

  it("stops notifying after unsubscribe, and other subscribers are unaffected", () => {
    const a: string[] = [];
    const b: string[] = [];
    const offA = subscribeMotion((m) => a.push(m));
    subscribeMotion((m) => b.push(m));
    setMotion("off");
    offA();
    setMotion("on");
    expect(a).toEqual(["off"]);
    expect(b).toEqual(["off", "on"]);
  });

  it("motionOn is true exactly while the setting is on", () => {
    expect(motionOn()).toBe(true);
    root.setAttribute("data-motion", "off");
    expect(motionOn()).toBe(false);
  });

  it("initMotion seeds the attribute from the stored choice when the boot script did not", () => {
    localStorage.setItem(MOTION_STORAGE_KEY, "off");
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("off");
  });

  it("initMotion defaults to on when nothing valid is stored", () => {
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("on");
    root.removeAttribute("data-motion");
    localStorage.setItem(MOTION_STORAGE_KEY, "banana");
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("on");
  });

  it("initMotion leaves a value the boot script already set alone, even if storage disagrees", () => {
    root.setAttribute("data-motion", "off");
    localStorage.setItem(MOTION_STORAGE_KEY, "on");
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("off");
  });

  it("initMotion replaces a garbage attribute", () => {
    root.setAttribute("data-motion", "sideways");
    initMotion();
    expect(root.getAttribute("data-motion")).toBe("on");
  });

  it("never consults the OS reduced-motion setting, even when it is on", () => {
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    expect(getMotion()).toBe("on");
    setMotion("on");
    expect(getMotion()).toBe("on");
    expect(matchMedia).not.toHaveBeenCalled();
  });
});
