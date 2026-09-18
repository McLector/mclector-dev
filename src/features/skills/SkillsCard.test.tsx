import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Skill } from "@/content/types";
import { SkillsCard } from "./SkillsCard";

const sample: Skill[] = [
  { id: "typescript", label: "TypeScript", group: "language", featured: true },
  { id: "python", label: "Python", group: "language" },
  { id: "expo", label: "Expo", group: "mobile", featured: true },
  { id: "git", label: "Git", group: "tooling", featured: true },
];

describe("SkillsCard", () => {
  it("renders inside the skills bento area", () => {
    const { container } = render(<SkillsCard skills={sample} />);
    expect(container.querySelectorAll('[data-bento-area="skills"]')).toHaveLength(1);
  });

  it("renders every featured skill", () => {
    render(<SkillsCard skills={sample} />);
    for (const label of ["TypeScript", "Expo", "Git"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("does not render non-featured skills", () => {
    render(<SkillsCard skills={sample} />);
    expect(screen.queryByText("Python")).not.toBeInTheDocument();
  });

  it("exposes the featured skills as a list for assistive tech", () => {
    render(<SkillsCard skills={sample} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders a subdued empty message when no skills are featured", () => {
    render(
      <SkillsCard skills={[{ id: "python", label: "Python", group: "language" }]} />,
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/skills coming soon/i)).toBeInTheDocument();
  });

  it("renders the empty state when the skills array itself is empty", () => {
    const { container } = render(<SkillsCard skills={[]} />);
    expect(screen.getByText(/skills coming soon/i)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-bento-area="skills"]')).toHaveLength(1);
  });

  it("renders a long featured list (12 skills) without throwing", () => {
    const many: Skill[] = Array.from({ length: 12 }, (_, i) => ({
      id: `skill-${i}`,
      label: `Skill ${i}`,
      group: "tooling",
      featured: true,
    }));
    render(<SkillsCard skills={many} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.getByText("Skill 11")).toBeInTheDocument();
  });

  it("always renders a heading so the card never collapses visually", () => {
    render(<SkillsCard skills={[]} />);
    expect(screen.getByRole("heading", { name: /skills/i })).toBeInTheDocument();
  });
});
