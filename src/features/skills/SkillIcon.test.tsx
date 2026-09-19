import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { Skill } from "@/content/types";
import { SkillIcon } from "./SkillIcon";

const skill = (icon?: string, label = "Some Tool"): Skill => ({
  id: "x",
  label,
  group: "tooling",
  icon,
});

describe("SkillIcon", () => {
  it("draws a filled mark in currentColor on the standard 24-unit box", () => {
    const { container } = render(<SkillIcon skill={skill("typescript")} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("fill", "currentColor");
    expect(container.querySelectorAll("path")).toHaveLength(1);
  });

  it("uses the mark's own viewBox when it is not 24 units", () => {
    const { container } = render(<SkillIcon skill={skill("reactnavigation")} />);
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 128 128");
  });

  it("draws stroke-style marks as strokes with no fill", () => {
    const { container } = render(<SkillIcon skill={skill("groq")} />);
    const path = container.querySelector("path")!;
    expect(path).toHaveAttribute("fill", "none");
    expect(path).toHaveAttribute("stroke", "currentColor");
    expect(container.querySelector("svg")).toHaveAttribute("fill", "none");
  });

  it("honours evenodd fill rules (the Zustand bear needs its eye holes)", () => {
    const { container } = render(<SkillIcon skill={skill("zustand")} />);
    expect(container.querySelector("path")).toHaveAttribute("fill-rule", "evenodd");
  });

  it("is decorative — hidden from assistive tech", () => {
    const { container } = render(<SkillIcon skill={skill("cline")} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to two-letter initials when there is no mark", () => {
    const { container, getByText } = render(<SkillIcon skill={skill(undefined, "Zustand Pro")} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(getByText("ZP")).toBeInTheDocument();
  });

  it("falls back to initials for an unknown slug rather than a broken icon", () => {
    const { container, getByText } = render(<SkillIcon skill={skill("nope", "Some Tool")} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(getByText("ST")).toBeInTheDocument();
  });
});
