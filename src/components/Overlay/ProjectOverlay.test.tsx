import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Project } from "@/content/types";
import { setMotion } from "@/lib/motion";
import { ProjectOverlay } from "./ProjectOverlay";

/**
 * Stream E — the project detail overlay. It is always mounted (App.tsx) and
 * derives everything from the `#/project/:id` hash, so "closed" and "unknown
 * slug" are the same render path: nothing.
 */

const known: Project = {
  id: "eiyu-system",
  title: "Eiyu-System",
  subtitle: "Habit tracker as RPG progression",
  summary: "Summary line.",
  description: [
    "First paragraph about the project.",
    "Second paragraph about the project.",
    "Third paragraph about the project.",
  ],
  role: "Solo developer",
  status: "in-progress",
  year: "2026",
  stack: ["React Native", "Expo", "Supabase"],
  thumbnail: {
    alt: "Eiyu-System app icon",
    placeholder: { kind: "gradient", seed: "eiyu-system", from: "#ff5f7e", to: "#b34fff" },
  },
  links: [
    { label: "Live demo", href: "https://eiyu-system.vercel.app", kind: "live" },
    { label: "Email me", href: "mailto:hello@example.com", kind: "case-study" },
  ],
  featured: true,
};

const other: Project = { ...known, id: "taskbuddy", title: "TaskBuddy", links: [] };

const projects = [known, other];

function resetHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

/** Renders the overlay next to a sentinel trigger, mimicking App.tsx's <main>. */
function renderWithTrigger(ui = <ProjectOverlay projects={projects} />) {
  return render(
    <>
      <main>
        <button type="button" data-testid="trigger">
          open eiyu
        </button>
      </main>
      {ui}
    </>,
  );
}

beforeEach(resetHash);
afterEach(() => {
  resetHash();
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});

describe("ProjectOverlay — when nothing is open", () => {
  it("renders nothing with no hash at all", () => {
    const { container } = render(<ProjectOverlay projects={projects} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing for an unknown slug (falls through to the grid)", () => {
    window.location.hash = "#/project/does-not-exist";
    render(<ProjectOverlay projects={projects} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["#/project/", "#/project", "#something-else", "#/project/../../etc"])(
    "renders nothing for the malformed hash %s",
    (hash) => {
      window.location.hash = hash;
      expect(() => render(<ProjectOverlay projects={projects} />)).not.toThrow();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );

  it("leaves body scroll and <main> untouched while closed", () => {
    renderWithTrigger();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.querySelector("main")).not.toHaveAttribute("inert");
  });
});

describe("ProjectOverlay — open via a known slug", () => {
  beforeEach(() => {
    window.location.hash = "#/project/eiyu-system";
  });

  it("renders a modal dialog portaled to document.body", () => {
    const { container } = render(<ProjectOverlay projects={projects} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(container).toBeEmptyDOMElement();
    expect(document.body).toContainElement(dialog);
  });

  it("labels the dialog with its own heading", () => {
    render(<ProjectOverlay projects={projects} />);

    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy!);
    expect(heading).toHaveTextContent("Eiyu-System");
  });

  it("moves focus to the dialog heading on open", async () => {
    renderWithTrigger();

    const heading = await screen.findByRole("heading", { name: "Eiyu-System" });
    expect(heading).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it("renders the project's metadata", () => {
    render(<ProjectOverlay projects={projects} />);
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByText("Habit tracker as RPG progression")).toBeInTheDocument();
    expect(within(dialog).getByText("Solo developer")).toBeInTheDocument();
    expect(within(dialog).getByText("2026")).toBeInTheDocument();
    expect(within(dialog).getByText(/in progress/i)).toBeInTheDocument();
  });

  it("renders every stack chip", () => {
    render(<ProjectOverlay projects={projects} />);
    const dialog = screen.getByRole("dialog");
    for (const tech of known.stack) {
      expect(within(dialog).getByText(tech)).toBeInTheDocument();
    }
  });

  it("renders ALL description paragraphs, one element each", () => {
    render(<ProjectOverlay projects={projects} />);

    const body = screen.getByTestId("project-overlay-description");
    expect(body.children).toHaveLength(known.description.length);
    for (const paragraph of known.description) {
      expect(within(body).getByText(paragraph)).toBeInTheDocument();
    }
  });

  it("renders links as real anchors, with target/rel only for external https links", () => {
    render(<ProjectOverlay projects={projects} />);
    const dialog = screen.getByRole("dialog");

    const live = within(dialog).getByRole("link", { name: /Live demo/ });
    expect(live).toHaveAttribute("href", "https://eiyu-system.vercel.app");
    expect(live).toHaveAttribute("target", "_blank");
    expect(live).toHaveAttribute("rel", "noopener noreferrer");

    const mail = within(dialog).getByRole("link", { name: /Email me/ });
    expect(mail).toHaveAttribute("href", "mailto:hello@example.com");
    expect(mail).not.toHaveAttribute("target");
    expect(mail).not.toHaveAttribute("rel");
  });

  it("renders no links section for a project with no links", () => {
    window.location.hash = "#/project/taskbuddy";
    render(<ProjectOverlay projects={projects} />);
    expect(screen.queryByTestId("project-overlay-links")).not.toBeInTheDocument();
  });

  it("makes the grid behind it inert and locks body scroll", () => {
    renderWithTrigger();

    expect(document.querySelector("main")).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("carries the shared-layout id matching the card row's thumbnail", () => {
    render(<ProjectOverlay projects={projects} />);
    expect(screen.getByTestId("project-overlay-thumb")).toHaveAttribute(
      "data-layout-id",
      "project-eiyu-system",
    );
  });
});

describe("ProjectOverlay — closing", () => {
  beforeEach(() => {
    window.location.hash = "#/project/eiyu-system";
  });

  it("closes on Escape, clearing the hash and removing the dialog", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(window.location.hash).toBe("");
  });

  it("closes when the explicit close button is pressed", async () => {
    const user = userEvent.setup();
    renderWithTrigger();

    await user.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(window.location.hash).toBe("");
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    renderWithTrigger();

    await user.click(screen.getByTestId("project-overlay-backdrop"));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("returns focus to the element that was focused when it opened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <main>
          <button type="button" data-testid="trigger">
            open eiyu
          </button>
        </main>
      </>,
    );
    screen.getByTestId("trigger").focus();

    rerender(
      <>
        <main>
          <button type="button" data-testid="trigger">
            open eiyu
          </button>
        </main>
        <ProjectOverlay projects={projects} />
      </>,
    );

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByTestId("trigger")).toHaveFocus());
  });

  it("restores body scroll and un-inerts the grid on close", async () => {
    const user = userEvent.setup();
    renderWithTrigger();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
    expect(document.querySelector("main")).not.toHaveAttribute("inert");
  });

  it("cleans up body scroll lock and inert if it unmounts while open", () => {
    const { unmount } = renderWithTrigger();
    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("ProjectOverlay — focus trap", () => {
  it("keeps Tab inside the dialog", async () => {
    window.location.hash = "#/project/eiyu-system";
    const user = userEvent.setup();
    renderWithTrigger();

    await screen.findByRole("dialog");
    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(screen.getByRole("dialog")).toContainElement(
        document.activeElement as HTMLElement,
      );
    }
  });
});

describe("ProjectOverlay — the Animations toggle", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-motion");
    localStorage.clear();
  });

  it("drops the shared-layout morph when the visitor has switched animations off", () => {
    setMotion("off");
    window.location.hash = "#/project/eiyu-system";
    render(<ProjectOverlay projects={projects} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("project-overlay-thumb")).not.toHaveAttribute("data-layout-id");
  });

  it("keeps the shared-layout morph by default, even when the OS asks for reduced motion", () => {
    // The OS setting is deliberately ignored (owner decision): the visible toggle is the only way to opt out.
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMedia);

    window.location.hash = "#/project/eiyu-system";
    render(<ProjectOverlay projects={projects} />);

    expect(screen.getByTestId("project-overlay-thumb")).toHaveAttribute("data-layout-id");
    expect(matchMedia).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
