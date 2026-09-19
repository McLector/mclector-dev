import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Skill } from "@/content/types";
import { SkillsCard } from "./SkillsCard";
import { getSkillIcon } from "./skillIcons";

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

  it("renders every skill label as accessible text — featured and not", () => {
    render(<SkillsCard skills={sample} />);
    for (const label of ["TypeScript", "Python", "Expo", "Git", "Zustand"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the merged display-row headings in mockup order", () => {
    render(<SkillsCard skills={sample} />);
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(["Languages · Mobile", "Web · Data", "Tools · APIs"]);
  });

  it("exposes each skill as a listitem for assistive tech", () => {
    render(<SkillsCard skills={sample} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(sample.length);
  });

  it("draws a brand svg per registered icon and a lettered fallback otherwise", () => {
    const { container } = render(<SkillsCard skills={sample} />);
    const withMark = sample.filter((s) => getSkillIcon(s.icon) !== null).length;
    expect(container.querySelectorAll("li svg")).toHaveLength(withMark);
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

  describe("hover tooltip", () => {
    it("shows the skill name in a body-portaled tooltip on pointer enter", () => {
      const { container } = render(<SkillsCard skills={sample} />);
      const tile = screen.getByText("TypeScript").closest("li")!;
      fireEvent.pointerEnter(tile);

      const tip = document.body.querySelector<HTMLElement>("[data-skill-tooltip]");
      expect(tip).not.toBeNull();
      expect(tip).toHaveTextContent("TypeScript");
      // Portaled to <body>, NOT inside the (scaled) card.
      expect(container.contains(tip)).toBe(false);
      expect(tip!.parentElement).toBe(document.body);
    });

    it("hides the tooltip on pointer leave", () => {
      render(<SkillsCard skills={sample} />);
      const tile = screen.getByText("Python").closest("li")!;
      fireEvent.pointerEnter(tile);
      fireEvent.pointerLeave(tile);
      const tip = document.body.querySelector<HTMLElement>("[data-skill-tooltip]");
      expect(tip?.getAttribute("data-visible")).not.toBe("true");
    });

    it("retargets the single tooltip when moving between tiles", () => {
      render(<SkillsCard skills={sample} />);
      fireEvent.pointerEnter(screen.getByText("Expo").closest("li")!);
      fireEvent.pointerEnter(screen.getByText("Git").closest("li")!);
      const tips = document.body.querySelectorAll("[data-skill-tooltip]");
      expect(tips).toHaveLength(1);
      expect(tips[0]).toHaveTextContent("Git");
    });

    it("removes the tooltip node when the card unmounts", () => {
      const { unmount } = render(<SkillsCard skills={sample} />);
      fireEvent.pointerEnter(screen.getByText("Git").closest("li")!);
      unmount();
      expect(document.body.querySelector("[data-skill-tooltip]")).toBeNull();
    });
  });
});
