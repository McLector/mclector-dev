import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Eyebrow } from "./Eyebrow";

describe("Eyebrow", () => {
  it("renders its text in a span by default", () => {
    render(<Eyebrow>Elsewhere</Eyebrow>);
    const el = screen.getByText("Elsewhere");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("eyebrow");
  });

  it("keeps heading semantics when rendered as an h2", () => {
    render(<Eyebrow as="h2">Skills &amp; Tools</Eyebrow>);
    expect(screen.getByRole("heading", { level: 2, name: /skills & tools/i })).toBeInTheDocument();
  });

  it("can render as a paragraph for non-heading labels", () => {
    render(<Eyebrow as="p">GMT+8 · Manila</Eyebrow>);
    expect(screen.getByText("GMT+8 · Manila").tagName).toBe("P");
  });

  it("merges a caller className without dropping the eyebrow class", () => {
    render(<Eyebrow className="mt-2">Label</Eyebrow>);
    const el = screen.getByText("Label");
    expect(el).toHaveClass("eyebrow");
    expect(el).toHaveClass("mt-2");
  });

  it("uses the mono display face", () => {
    render(<Eyebrow>Label</Eyebrow>);
    expect(screen.getByText("Label").className).toContain("font-mono");
  });
});
