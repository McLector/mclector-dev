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
