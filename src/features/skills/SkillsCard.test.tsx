import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Skill } from "@/content/types";
import { SkillsCard } from "./SkillsCard";

const sample: Skill[] = [
  { id: "typescript", label: "TypeScript", group: "language", featured: true, icon: "typescript" },
  { id: "python", label: "Python", group: "language", icon: "python" },
  { id: "expo", label: "Expo", group: "mobile", featured: true, icon: "expo" },
  { id: "git", label: "Git", group: "tooling", featured: true, icon: "git" },
  { id: "zustand", label: "Zustand", group: "web" },
];

describe("SkillsCard", () => {
  it("renders inside the skills bento area", () => {
    const { container } = render(<SkillsCard skills={sample} />);
    expect(container.querySelectorAll('[data-bento-area="skills"]')).toHaveLength(1);
  });

  it("renders every skill — featured and not", () => {
    render(<SkillsCard skills={sample} />);
    for (const label of ["TypeScript", "Python", "Expo", "Git", "Zustand"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders a heading for each populated group in canonical order", () => {
    render(<SkillsCard skills={sample} />);
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(["Languages", "Mobile", "Web", "Tooling"]);
  });

  it("exposes each skill as a listitem for assistive tech", () => {
    render(<SkillsCard skills={sample} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(sample.length);
  });

  it("draws a brand svg for skills with an icon and a lettered fallback otherwise", () => {
    const { container } = render(<SkillsCard skills={sample} />);
    // 4 of the 5 sample skills have an icon slug → 4 <svg> marks.
    expect(container.querySelectorAll("svg")).toHaveLength(4);
    // Zustand has no mark → its two-letter fallback appears.
    expect(screen.getByText("ZU")).toBeInTheDocument();
  });

  it("renders a subdued empty message when there are no skills", () => {
    const { container } = render(<SkillsCard skills={[]} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/skills coming soon/i)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-bento-area="skills"]')).toHaveLength(1);
  });

  it("always renders the card heading so it never collapses visually", () => {
    render(<SkillsCard skills={[]} />);
    expect(
      screen.getByRole("heading", { name: /skills & tools/i }),
    ).toBeInTheDocument();
  });

  it("renders a long list without throwing", () => {
    const many: Skill[] = Array.from({ length: 12 }, (_, i) => ({
      id: `skill-${i}`,
      label: `Skill ${i}`,
      group: "tooling",
    }));
    render(<SkillsCard skills={many} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.getByText("Skill 11")).toBeInTheDocument();
  });
});
