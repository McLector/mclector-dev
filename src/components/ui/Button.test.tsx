import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, buttonClasses } from "./Button";

describe("Button size", () => {
  it("defaults to the regular size", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("px-5", "py-2.5", "text-sm");
  });

  it("renders a slim pill for size=slim, without the regular padding", () => {
    render(<Button size="slim">Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("px-[18px]", "py-2.5", "text-[12.5px]");
    expect(btn).not.toHaveClass("px-5");
    expect(btn).not.toHaveClass("text-sm");
  });

  it("buttonClasses honours size for non-button elements (the CV link)", () => {
    const cls = buttonClasses("secondary", { size: "slim" });
    expect(cls).toContain("px-[18px]");
    expect(cls).not.toContain("px-5");
  });

  it("stays a full pill in both sizes", () => {
    for (const size of ["regular", "slim"] as const) {
      render(<Button size={size}>{size}</Button>);
      expect(screen.getByRole("button", { name: size })).toHaveClass("rounded-full");
    }
  });

  it("keeps a caller className", () => {
    render(<Button className="extra">Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("extra");
  });
});

/**
 * Tailwind 4 lifts with the standalone `translate` property and presses with `scale`, not `transform`, so a
 * transition list that names only `transform` leaves the lift and the press snapping instantly. A hover that
 * changes `opacity` is no better unless `opacity` is listed too.
 */
describe("Button hover transition", () => {
  const transitionList = (cls: string) => /transition-\[([^\]]+)\]/.exec(cls)?.[1].split(",") ?? [];

  for (const variant of ["primary", "secondary", "downloadReady"] as const) {
    it(`${variant}: the transition covers the lift (translate) and the press (scale)`, () => {
      const props = transitionList(buttonClasses(variant, { size: "slim" }));
      expect(props).toContain("translate");
      expect(props).toContain("scale");
      expect(props).toContain("box-shadow");
    });
  }

  it("downloadReady: hover lifts and grows its glow, and never dims the pill", () => {
    const cls = buttonClasses("downloadReady", { size: "slim" });
    expect(cls).toContain("hover-fine:-translate-y-0.5");
    expect(cls).toMatch(/hover-fine:shadow-\[/);
    expect(cls).not.toMatch(/hover(-fine)?:opacity-/);
  });

  it("every property a hover utility changes is listed in the transition", () => {
    const cls = buttonClasses("downloadReady", { size: "slim" });
    const props = transitionList(cls);
    if (/hover(-fine)?:[^\s]*translate/.test(cls)) expect(props).toContain("translate");
    if (/hover(-fine)?:shadow-/.test(cls)) expect(props).toContain("box-shadow");
    if (/hover(-fine)?:opacity-/.test(cls)) expect(props).toContain("opacity");
    if (/hover(-fine)?:bg-/.test(cls)) expect(props).toContain("background-color");
  });
});
