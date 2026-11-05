import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { GalaxyBackdrop } from "./GalaxyBackdrop";
import { setMotion } from "@/lib/motion";

/**
 * The backdrop is four static, CSS-driven layers. It owns no canvas, pointer parallax or frame loop;
 * whatever motion it has comes from index.css, gated by html[data-motion].
 */
describe("GalaxyBackdrop", () => {
  const root = document.documentElement;
  let spies: { mockRestore: () => void }[] = [];

  beforeEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
  });
  afterEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
    spies.forEach((spy) => spy.mockRestore());
    spies = [];
  });

  it("renders the sky, both star layers and the horizon hairline, hidden from assistive tech", () => {
    const { container } = render(<GalaxyBackdrop />);
    for (const selector of [".galaxy", ".stars", ".stars-near", ".horizon-line"]) {
      const el = container.querySelector(selector);
      expect(el, selector).not.toBeNull();
      expect(el!.getAttribute("aria-hidden"), selector).toBe("true");
    }
  });

  it("renders none of the removed layers", () => {
    const { container } = render(<GalaxyBackdrop />);
    for (const selector of ["canvas", ".galaxy-parallax", ".starfield-grid", ".comet"]) {
      expect(container.querySelector(selector), selector).toBeNull();
    }
  });

  it("attaches no pointer or resize listener and never schedules a frame", () => {
    const add = vi.spyOn(window, "addEventListener");
    const raf = vi.spyOn(window, "requestAnimationFrame");
    spies = [add, raf];

    const assertQuiet = () => {
      const types = add.mock.calls.map((call) => call[0]);
      expect(types).not.toContain("pointermove");
      expect(types).not.toContain("resize");
      expect(raf).not.toHaveBeenCalled();
    };

    render(<GalaxyBackdrop />);
    assertQuiet();
    act(() => setMotion("on"));
    assertQuiet();
  });
});
