import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Social } from "@/content/types";
import { SocialHex } from "./SocialHex";

/**
 * Fixtures, never the real content module — see docs/contracts.md. The
 * hexIndex values are deliberately out of order so the component is forced to
 * place cells by hexIndex rather than by array position.
 */
const socials: Social[] = [
  { id: "linkedin", label: "LinkedIn", href: "https://linkedin.com/in/me", icon: "linkedin", hexIndex: 1 },
  { id: "email", label: "Email", href: "mailto:me@example.com", icon: "email", hexIndex: 2 },
  { id: "github", label: "GitHub", href: "https://github.com/me", icon: "github", hexIndex: 0 },
];

function links() {
  return screen.getAllByRole("link");
}

describe("SocialHex — rendering", () => {
  it("renders one hex per social, ordered by hexIndex", () => {
    render(<SocialHex socials={socials} />);
    expect(links().map((a) => a.getAttribute("aria-label"))).toEqual([
      "GitHub",
      "LinkedIn",
      "Email",
    ]);
  });

  it("gives every social an accessible name without any hover interaction", () => {
    render(<SocialHex socials={socials} />);
    // No hover is simulated before these queries on purpose: the name must
    // never depend on the reveal-on-hover label.
    for (const label of ["GitHub", "LinkedIn", "Email"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("points each hex at its href", () => {
    render(<SocialHex socials={socials} />);
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/me",
    );
  });

  it("opens https links in a new tab with a safe rel", () => {
    render(<SocialHex socials={socials} />);
    const github = screen.getByRole("link", { name: "GitHub" });
    expect(github).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not add target=_blank to a mailto: link", () => {
    render(<SocialHex socials={socials} />);
    const email = screen.getByRole("link", { name: "Email" });
    expect(email).not.toHaveAttribute("target");
    expect(email).not.toHaveAttribute("rel");
  });

  it("renders the visible label alongside the icon for every hex", () => {
    render(<SocialHex socials={socials} />);
    // Present in the DOM at all times — CSS reveals it on hover/focus-visible.
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
  });

  it("puts the focus ring on an unclipped wrapper, not on the clipped hex", () => {
    render(<SocialHex socials={socials} />);
    const github = screen.getByRole("link", { name: "GitHub" });
    const cell = github.closest("[data-hex-cell]");
    expect(cell).not.toBeNull();
    const ring = cell?.querySelector("[data-hex-focus-ring]");
    expect(ring).not.toBeNull();
    // The ring must be a sibling of the clipped anchor, never a descendant of
    // it — a clip-path on the anchor would clip its own outline away.
    expect(github.contains(ring as Node)).toBe(false);
  });

  it("renders inside the social bento area", () => {
    const { container } = render(<SocialHex socials={socials} />);
    expect(container.querySelector('[data-bento-area="social"]')).not.toBeNull();
  });
});

describe("SocialHex — edge cases", () => {
  it("renders a single-item list without crashing", () => {
    render(<SocialHex socials={[socials[2]]} />);
    expect(links()).toHaveLength(1);
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("tabindex", "0");
  });

  it("arrow keys on a single-item list keep focus where it is", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={[socials[2]]} />);
    const only = screen.getByRole("link", { name: "GitHub" });
    only.focus();
    await user.keyboard("{ArrowRight}{ArrowDown}{ArrowLeft}{ArrowUp}");
    expect(only).toHaveFocus();
    expect(only).toHaveAttribute("tabindex", "0");
  });

  it("renders an empty list without crashing and without any links", () => {
    const { container } = render(<SocialHex socials={[]} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(container.querySelector('[data-bento-area="social"]')).not.toBeNull();
  });

  it("covers every icon name in the SocialIconName union", () => {
    const all: Social[] = (
      ["github", "linkedin", "email", "x", "instagram", "youtube", "tiktok"] as const
    ).map((icon, i) => ({
      id: icon,
      label: icon,
      href: `https://example.com/${icon}`,
      icon,
      hexIndex: i,
    }));
    const { container } = render(<SocialHex socials={all} />);
    expect(links()).toHaveLength(7);
    // Every hex paints a real icon — no missing-glyph holes.
    expect(container.querySelectorAll("svg[data-social-icon]")).toHaveLength(7);
  });

  it("renders a # placeholder as a same-page link (no new tab, no rel)", () => {
    render(
      <SocialHex
        socials={[{ id: "x", label: "X", href: "#", icon: "x", hexIndex: 0 }]}
      />,
    );
    const [link] = links();
    expect(link).toHaveAttribute("href", "#");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });
});

describe("SocialHex — roving tabindex and arrow keys", () => {
  it("starts with only the first cell in the tab order", () => {
    render(<SocialHex socials={socials} />);
    const [first, second, third] = links();
    expect(first).toHaveAttribute("tabindex", "0");
    expect(second).toHaveAttribute("tabindex", "-1");
    expect(third).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus right and hands the tab stop over to the new cell", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={socials} />);
    const [first, second] = links();
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("tabindex", "0");
    expect(first).toHaveAttribute("tabindex", "-1");
  });

  it("moves back left", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={socials} />);
    const [first] = links();
    first.focus();
    await user.keyboard("{ArrowRight}{ArrowLeft}");
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("tabindex", "0");
  });

  it("does not move past the edge of a row", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={socials} />);
    const [first] = links();
    first.focus();
    await user.keyboard("{ArrowLeft}");
    expect(first).toHaveFocus();
  });

  it("moves down into the second honeycomb row and back up per hexNeighborMap", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={socials} />);
    const [first, second, third] = links();
    first.focus();
    await user.keyboard("{ArrowDown}");
    expect(third).toHaveFocus(); // down(0) === 2

    await user.keyboard("{ArrowUp}");
    expect(first).toHaveFocus(); // up(2) === 0

    second.focus();
    await user.keyboard("{ArrowDown}");
    expect(third).toHaveFocus(); // down(1) === 2
  });

  it("jumps to the first cell on Home and the last on End", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={socials} />);
    const [first, , third] = links();
    first.focus();
    await user.keyboard("{End}");
    expect(third).toHaveFocus();
    expect(third).toHaveAttribute("tabindex", "0");

    await user.keyboard("{Home}");
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("tabindex", "0");
  });

  it("keeps exactly one cell in the tab order after navigating", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={socials} />);
    links()[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(links().filter((a) => a.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  it("activates the focused cell with Space", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={socials} />);
    const github = screen.getByRole("link", { name: "GitHub" });
    let clicked = 0;
    github.addEventListener("click", (event) => {
      event.preventDefault();
      clicked += 1;
    });
    github.focus();
    await user.keyboard(" ");
    expect(clicked).toBe(1);
  });

  it("activates the focused cell with Enter, exactly once", async () => {
    const user = userEvent.setup();
    render(<SocialHex socials={socials} />);
    const github = screen.getByRole("link", { name: "GitHub" });
    let clicked = 0;
    github.addEventListener("click", (event) => {
      event.preventDefault();
      clicked += 1;
    });
    github.focus();
    await user.keyboard("{Enter}");
    expect(clicked).toBe(1);
  });
});
