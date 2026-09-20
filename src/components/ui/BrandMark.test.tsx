import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BrandMark } from "./BrandMark";
import faviconSvg from "../../../public/favicon.svg?raw";

/**
 * The brand mark: the owner's M inside the arc reactor inside a hexagon (round 3b, "L1 hex tile", full cut).
 * The tab icon (public/favicon.svg) and this inline mark are the SAME artwork, so these tests read the real
 * favicon file and check the two cannot drift apart.
 */
const pathData = (svg: string) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);

describe("BrandMark", () => {
  it("is a decorative 32x32 svg at the requested size (the handle beside it already names it)", () => {
    const { container } = render(<BrandMark size={18} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox", "0 0 32 32");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("height", "18");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("defaults to 18px, the size used beside the handle", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "18");
  });

  it("draws exactly the hexagon, the reactor ring and the M", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelectorAll("path")).toHaveLength(3);
  });

  it("uses the SAME geometry as the favicon file, path for path", () => {
    const { container } = render(<BrandMark />);
    const inline = [...container.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    expect(inline).toEqual(pathData(faviconSvg));
  });

  it("is flat and geometric: no text, no font, no gradient (favicons cannot rely on a webfont, and gradients muddy at 16px)", () => {
    const { container } = render(<BrandMark />);
    expect(container.innerHTML).not.toMatch(/<text|font-family|Gradient/i);
    expect(faviconSvg).not.toMatch(/<text|font-family|Gradient/i);
  });

  it("uses only the navy tile and the arc cyan, in both the inline mark and the favicon", () => {
    const allowed = new Set(["#07122e", "#5ec8ff", "none"]);
    const colours = (s: string) => [...s.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1].toLowerCase());
    const { container } = render(<BrandMark />);
    for (const c of [...colours(container.innerHTML), ...colours(faviconSvg)]) expect(allowed.has(c), c).toBe(true);
  });

  it("merges a className onto the svg", () => {
    const { container } = render(<BrandMark className="shrink-0" />);
    expect(container.querySelector("svg")).toHaveClass("shrink-0");
  });
});
