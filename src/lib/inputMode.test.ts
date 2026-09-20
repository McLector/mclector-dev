import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInputMode, initialInputMode, installInputMode, modeForPointer } from "./inputMode";

/**
 * Why this exists: hover styles used to sit behind `@media (hover: hover) and (pointer: fine)`. Some
 * machines (a touchscreen laptop was the owner's) report a device that fails that query even though a
 * real mouse is attached, so hover never fired and the hexagons showed their names permanently.
 * The mode is now decided by the input the visitor actually uses, not by what the browser claims.
 */
describe("modeForPointer", () => {
  it("a touch pointer means touch", () => {
    expect(modeForPointer("touch", "mouse")).toBe("touch");
    expect(modeForPointer("touch", "touch")).toBe("touch");
  });

  it("a mouse or a pen means mouse — both can hover", () => {
    expect(modeForPointer("mouse", "touch")).toBe("mouse");
    expect(modeForPointer("pen", "touch")).toBe("mouse");
  });

  it("leaves the mode alone for anything it does not recognise", () => {
    expect(modeForPointer("", "touch")).toBe("touch");
    expect(modeForPointer("", "mouse")).toBe("mouse");
    expect(modeForPointer("gamepad", "mouse")).toBe("mouse");
    expect(modeForPointer("gamepad", "touch")).toBe("touch");
  });
});

describe("initialInputMode", () => {
  it("is mouse when ANY input can hover, touch otherwise", () => {
    expect(initialInputMode(true)).toBe("mouse");
    expect(initialInputMode(false)).toBe("touch");
  });
});

describe("the live mode (the <html data-input> attribute)", () => {
  const root = document.documentElement;
  let uninstall: (() => void) | undefined;

  function stubAnyHover(matches: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("any-hover") ? matches : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  }
  /** jsdom's PointerEvent support varies by version; a plain Event with the field is all the handler reads. */
  function pointer(type: "pointerdown" | "pointermove", pointerType: string, target: EventTarget = document.body) {
    const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerType });
    target.dispatchEvent(event);
  }

  beforeEach(() => {
    root.removeAttribute("data-input");
  });
  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    root.removeAttribute("data-input");
    vi.unstubAllGlobals();
  });

  it("reads touch when the attribute is absent: with no evidence of a mouse, names stay visible", () => {
    expect(getInputMode()).toBe("touch");
    root.setAttribute("data-input", "nonsense");
    expect(getInputMode()).toBe("touch");
  });

  it("seeds the attribute from any-hover when nothing (e.g. the boot script) has set it", () => {
    stubAnyHover(true);
    uninstall = installInputMode(root, window);
    expect(root.getAttribute("data-input")).toBe("mouse");
  });

  it("seeds touch when no input can hover", () => {
    stubAnyHover(false);
    uninstall = installInputMode(root, window);
    expect(root.getAttribute("data-input")).toBe("touch");
  });

  it("does not overwrite a value the boot script already set", () => {
    stubAnyHover(false);
    root.setAttribute("data-input", "mouse");
    uninstall = installInputMode(root, window);
    expect(root.getAttribute("data-input")).toBe("mouse");
  });

  it("flips to mouse on the first real mouse move — even when the browser claims there is no hover", () => {
    // The owner's laptop: any-hover / hover report none, yet a mouse is attached.
    stubAnyHover(false);
    uninstall = installInputMode(root, window);
    expect(getInputMode()).toBe("touch");
    pointer("pointermove", "mouse");
    expect(getInputMode()).toBe("mouse");
  });

  it("flips to touch on a touch press, and back to mouse when the mouse moves again (hybrid laptop)", () => {
    stubAnyHover(true);
    uninstall = installInputMode(root, window);
    pointer("pointerdown", "touch");
    expect(getInputMode()).toBe("touch");
    pointer("pointermove", "mouse");
    expect(getInputMode()).toBe("mouse");
  });

  it("treats a pen like a mouse", () => {
    stubAnyHover(false);
    uninstall = installInputMode(root, window);
    pointer("pointermove", "pen");
    expect(getInputMode()).toBe("mouse");
  });

  it("ignores pointer types it does not know", () => {
    stubAnyHover(true);
    uninstall = installInputMode(root, window);
    pointer("pointermove", "");
    pointer("pointermove", "gamepad");
    expect(getInputMode()).toBe("mouse");
  });

  it("hears events that start deep in the page (capture phase on window)", () => {
    stubAnyHover(false);
    uninstall = installInputMode(root, window);
    const deep = document.createElement("span");
    document.body.appendChild(deep);
    pointer("pointermove", "mouse", deep);
    deep.remove();
    expect(getInputMode()).toBe("mouse");
  });

  it("stops listening once uninstalled", () => {
    stubAnyHover(false);
    uninstall = installInputMode(root, window);
    uninstall();
    uninstall = undefined;
    pointer("pointermove", "mouse");
    expect(getInputMode()).toBe("touch");
  });
});
