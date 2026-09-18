import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BentoCard } from "./BentoCard";

describe("BentoCard", () => {
  it("maps the area prop to CSS grid-area", () => {
    render(
      <BentoCard area="intro">
        <p>content</p>
      </BentoCard>,
    );
    const card = screen.getByText("content").parentElement;
    expect(card).toHaveStyle({ gridArea: "intro" });
    expect(card).toHaveAttribute("data-bento-area", "intro");
  });

  it("renders as a section when as='section'", () => {
    render(
      <BentoCard area="work" as="section">
        <p>work items</p>
      </BentoCard>,
    );
    expect(screen.getByText("work items").parentElement?.tagName).toBe("SECTION");
  });

  it("omits padding classes when padded=false", () => {
    render(
      <BentoCard area="pass" padded={false}>
        <p>canvas host</p>
      </BentoCard>,
    );
    const card = screen.getByText("canvas host").parentElement;
    expect(card?.className).not.toMatch(/\bp-5\b/);
  });
});
