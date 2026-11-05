import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { GalaxyBackdrop } from "./GalaxyBackdrop";
import { setMotion } from "@/lib/motion";

/**
 * The backdrop is OFF by default now, so its draw loop must not run until a visitor turns animations on:
 * a perpetual requestAnimationFrame loop repainting a still scene is wasted CPU and battery on every first visit.
 * jsdom has no 2D canvas and no real frame clock, so both are faked here.
 */
const ctx = {
  clearRect: vi.fn(),
  setTransform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
};

let spies: { mockRestore: () => void }[] = [];
let queue = new Map<number, FrameRequestCallback>();
let nextId = 0;
/** Run every queued frame once (frames they schedule land in the next flush). */
const flushFrame = () => {
  const frames = [...queue.values()];
  queue = new Map();
  act(() => frames.forEach((cb) => cb(0)));
};

/** jsdom has no PointerEvent, so fireEvent would drop the coordinates; a MouseEvent carries them. */
const pointerToCorner = () =>
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: window.innerWidth, clientY: window.innerHeight }));
  });

describe("GalaxyBackdrop", () => {
  const root = document.documentElement;

  beforeEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
    queue = new Map();
    nextId = 0;
    // The component also assigns plain properties (fillStyle, lineWidth...) onto the stub; only the mocks clear.
    for (const fn of Object.values(ctx)) if (vi.isMockFunction(fn)) fn.mockClear();
    spies = [
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ctx as never),
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        queue.set(++nextId, cb);
        return nextId;
      }),
      vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
        queue.delete(id);
      }),
    ];
  });
  afterEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
    spies.forEach((spy) => spy.mockRestore());
  });

  it("renders every layer: sky, star layers, canvas and dot grid", () => {
    const { container } = render(<GalaxyBackdrop />);
    for (const selector of [".galaxy", ".galaxy-parallax", ".stars", ".stars-bright", "canvas", ".starfield-grid"]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
  });

  describe("while animations are off (the default)", () => {
    it("schedules no frame loop at all", () => {
      render(<GalaxyBackdrop />);
      expect(queue.size).toBe(0);
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it("still paints ONE still frame: the rocks at rest, no falling code, no comet", () => {
      render(<GalaxyBackdrop />);
      expect(ctx.clearRect).toHaveBeenCalledTimes(1);
      expect(ctx.fill).toHaveBeenCalled(); // asteroids
      expect(ctx.fillText).not.toHaveBeenCalled(); // no data rain
    });

    it("repaints that still frame after a resize, since resizing clears the canvas", () => {
      render(<GalaxyBackdrop />);
      ctx.clearRect.mockClear();
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(ctx.clearRect).toHaveBeenCalledTimes(1);
      expect(queue.size).toBe(0);
    });

    it("does not move the star layers with the pointer", () => {
      const { container } = render(<GalaxyBackdrop />);
      pointerToCorner();
      expect(container.querySelector<HTMLElement>(".galaxy-parallax")!.style.transform).toBe("");
    });
  });

  describe("while animations are on", () => {
    beforeEach(() => setMotion("on"));

    it("runs the frame loop, rescheduling itself every frame", () => {
      render(<GalaxyBackdrop />);
      expect(queue.size).toBe(1);
      flushFrame();
      expect(queue.size).toBe(1);
    });

    it("draws the falling code as well as the rocks", () => {
      render(<GalaxyBackdrop />);
      flushFrame();
      expect(ctx.fillText).toHaveBeenCalled();
    });

    it("nudges the star layers with the pointer", () => {
      const { container } = render(<GalaxyBackdrop />);
      pointerToCorner();
      // Pointer at the far corner: nx = ny = 0.5 -> -8px, -6px.
      expect(container.querySelector<HTMLElement>(".galaxy-parallax")!.style.transform).toBe("translate(-8px, -6px)");
    });

    it("stops the loop the moment animations are switched off, and clears a leftover parallax offset", () => {
      const { container } = render(<GalaxyBackdrop />);
      pointerToCorner();
      act(() => setMotion("off"));
      expect(queue.size).toBe(0);
      expect(container.querySelector<HTMLElement>(".galaxy-parallax")!.style.transform).toBe("");
    });

    it("leaves a still frame behind when it stops, so the sky is not blank", () => {
      render(<GalaxyBackdrop />);
      ctx.clearRect.mockClear();
      act(() => setMotion("off"));
      expect(ctx.clearRect).toHaveBeenCalledTimes(1);
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it("cancels the pending frame on unmount", () => {
      const { unmount } = render(<GalaxyBackdrop />);
      expect(queue.size).toBe(1);
      unmount();
      expect(queue.size).toBe(0);
    });
  });

  it("starts the loop when animations are switched on after load, and only one loop", () => {
    render(<GalaxyBackdrop />);
    expect(queue.size).toBe(0);
    act(() => setMotion("on"));
    expect(queue.size).toBe(1);
    act(() => setMotion("on")); // no change, nothing to start
    expect(queue.size).toBe(1);
  });
});
