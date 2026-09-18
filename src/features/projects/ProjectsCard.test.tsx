import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Project } from "@/content/types";
import { ProjectsCard } from "./ProjectsCard";

/**
 * Stream E — the "work" card. It is a launcher, not a detail view: the only
 * thing a row does is write `#/project/:id`. <ProjectOverlay> (mounted
 * separately in App.tsx) is what reacts to that.
 */

function makeProject(overrides: Partial<Project> & Pick<Project, "id">): Project {
  return {
    title: `Title ${overrides.id}`,
    subtitle: `Subtitle ${overrides.id}`,
    summary: `Summary ${overrides.id}`,
    description: [`Paragraph for ${overrides.id}`],
    role: "Solo developer",
    status: "in-progress",
    year: "2026",
    stack: ["TypeScript"],
    thumbnail: {
      alt: `${overrides.id} thumbnail`,
      placeholder: { kind: "gradient", seed: overrides.id, from: "#ff5f7e", to: "#b34fff" },
    },
    links: [],
    featured: true,
    ...overrides,
  };
}

const fixtures: Project[] = [
  makeProject({ id: "alpha", title: "Alpha", subtitle: "First one", featured: true }),
  makeProject({ id: "bravo", title: "Bravo", subtitle: "Second one", featured: true }),
  makeProject({ id: "charlie", title: "Charlie", subtitle: "Hidden one", featured: false }),
];

function resetHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

beforeEach(resetHash);
afterEach(resetHash);

describe("ProjectsCard", () => {
  it("renders inside the work bento area", () => {
    const { container } = render(<ProjectsCard projects={fixtures} />);
    expect(container.querySelector('[data-bento-area="work"]')).not.toBeNull();
  });

  it("renders a heading for the card", () => {
    render(<ProjectsCard projects={fixtures} />);
    expect(screen.getByRole("heading", { name: /projects/i })).toBeInTheDocument();
  });

  it("renders ONLY featured projects", () => {
    render(<ProjectsCard projects={fixtures} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("shows each featured project's title and subtitle", () => {
    render(<ProjectsCard projects={fixtures} />);
    const row = screen.getByTestId("project-row-alpha");
    expect(within(row).getByText("Alpha")).toBeInTheDocument();
    expect(within(row).getByText("First one")).toBeInTheDocument();
  });

  it("paints the thumbnail as a CSS gradient rather than a broken <img>", () => {
    const { container } = render(<ProjectsCard projects={fixtures} />);

    expect(container.querySelector("img")).toBeNull();
    // jsdom normalises hex colours to rgb() in the serialised style attribute.
    const thumb = screen.getByTestId("project-thumb-alpha");
    const style = thumb.getAttribute("style") ?? "";
    expect(style).toContain("rgb(255, 95, 126)"); // #ff5f7e — placeholder.from
    expect(style).toContain("rgb(179, 79, 255)"); // #b34fff — placeholder.to
    expect(style).toContain("linear-gradient");
  });

  it("gives each thumbnail a stable shared-layout id for the overlay morph", () => {
    render(<ProjectsCard projects={fixtures} />);
    expect(screen.getByTestId("project-thumb-alpha")).toHaveAttribute(
      "data-layout-id",
      "project-alpha",
    );
  });

  it("exposes each row as a button that announces it opens a dialog", () => {
    render(<ProjectsCard projects={fixtures} />);
    const row = screen.getByTestId("project-row-bravo");
    expect(row.tagName).toBe("BUTTON");
    expect(row).toHaveAttribute("aria-haspopup", "dialog");
    expect(row).toHaveAccessibleName(/Bravo/);
  });

  it("writes the #/project/:id hash when a row is clicked", async () => {
    const user = userEvent.setup();
    render(<ProjectsCard projects={fixtures} />);

    await user.click(screen.getByTestId("project-row-bravo"));

    expect(window.location.hash).toBe("#/project/bravo");
  });

  it("is operable from the keyboard (Enter on a focused row)", async () => {
    const user = userEvent.setup();
    render(<ProjectsCard projects={fixtures} />);

    screen.getByTestId("project-row-alpha").focus();
    await user.keyboard("{Enter}");

    expect(window.location.hash).toBe("#/project/alpha");
  });

  it("renders a subdued empty state when nothing is featured", () => {
    render(<ProjectsCard projects={[makeProject({ id: "charlie", featured: false })]} />);

    expect(screen.getByTestId("projects-empty")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("does not crash on an entirely empty projects array", () => {
    expect(() => render(<ProjectsCard projects={[]} />)).not.toThrow();
    expect(screen.getByTestId("projects-empty")).toBeInTheDocument();
  });
});
