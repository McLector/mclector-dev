import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Profile } from "@/content/types";
import { IntroCard } from "./IntroCard";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    handle: "@TestHandle",
    displayName: "Test Person",
    headline: ["Hello!", "I'm Test Person"],
    bioLead: "Lead phrase of the bio.",
    bioRest: "The rest of the bio, in a lighter weight.",
    avatar: {
      alt: "Test Person",
      placeholder: { kind: "monogram", seed: "TP", from: "#000", to: "#fff" },
    },
    badge: {
      title: "Test Person",
      subtitle: "Subtitle",
      idLabel: "ID-1",
      caption: "Caption",
    },
    location: {
      city: "Batangas",
      country: "PH",
      timeZone: "Asia/Manila",
      utcLabel: "GMT+8",
      mapTexture: {
        alt: "Map",
        placeholder: { kind: "pattern", seed: "m", from: "#000", to: "#fff" },
      },
    },
    email: "test@example.com",
    cv: { label: "CV", available: false },
    openTo: ["Internships", "Freelance", "Entry-level", "Remote"],
    ...overrides,
  };
}

describe("IntroCard", () => {
  it("renders inside the intro bento area", () => {
    const { container } = render(<IntroCard profile={makeProfile()} />);
    expect(container.querySelectorAll('[data-bento-area="intro"]')).toHaveLength(1);
  });

  it("puts the brand mark inside the handle, in place of the eyebrow's arc dot", () => {
    render(<IntroCard profile={makeProfile()} />);
    const handle = screen.getByText("@TestHandle");
    // One lead glyph, not two: the mark replaces the dot the .eyebrow rule would otherwise draw.
    expect(handle.querySelector("svg")).not.toBeNull();
    expect(handle.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(handle).toHaveClass("before:hidden");
    // The handle's accessible text is unchanged: the mark is decoration.
    expect(handle).toHaveTextContent("@TestHandle");
  });

  it("renders the handle label", () => {
    render(<IntroCard profile={makeProfile()} />);
    expect(screen.getByText("@TestHandle")).toBeInTheDocument();
  });

  it("renders both headline lines inside a single level-1 heading", () => {
    render(<IntroCard profile={makeProfile()} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Hello!");
    expect(heading).toHaveTextContent("I'm Test Person");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders bioLead and bioRest, with bioLead emphasized", () => {
    render(<IntroCard profile={makeProfile()} />);
    const lead = screen.getByText("Lead phrase of the bio.");
    expect(lead).toBeInTheDocument();
    expect(lead.tagName).toBe("STRONG");
    expect(
      screen.getByText("The rest of the bio, in a lighter weight."),
    ).toBeInTheDocument();
  });

  it("keeps bioLead and bioRest in the same paragraph", () => {
    render(<IntroCard profile={makeProfile()} />);
    const lead = screen.getByText("Lead phrase of the bio.");
    const rest = screen.getByText("The rest of the bio, in a lighter weight.");
    expect(lead.closest("p")).not.toBeNull();
    expect(lead.closest("p")).toBe(rest.closest("p"));
  });

  it("renders a very long displayName and bioRest without dropping content", () => {
    const longName = "Bartholomew ".repeat(20).trim();
    const longRest = "Lorem ipsum dolor sit amet. ".repeat(60).trim();
    render(
      <IntroCard
        profile={makeProfile({
          displayName: longName,
          headline: ["Hello!", `I'm ${longName}`],
          bioRest: longRest,
        })}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(longName);
    expect(screen.getByText(longRest)).toBeInTheDocument();
  });

  it("renders without throwing when bioRest is empty", () => {
    render(<IntroCard profile={makeProfile({ bioRest: "" })} />);
    expect(screen.getByText("Lead phrase of the bio.")).toBeInTheDocument();
  });

  describe("Currently Active status", () => {
    it("shows the status text", () => {
      render(<IntroCard profile={makeProfile()} />);
      expect(screen.getByText("Currently Active")).toBeInTheDocument();
    });

    it("sits in the same top row as the handle, not in the heading or bio", () => {
      render(<IntroCard profile={makeProfile()} />);
      const status = screen.getByText("Currently Active");
      const handle = screen.getByText("@TestHandle");
      expect(status.parentElement).toBe(handle.parentElement);
      expect(screen.getByRole("heading", { level: 1 })).not.toContainElement(status);
    });

    it("hides the decorative ripple dot from assistive tech", () => {
      render(<IntroCard profile={makeProfile()} />);
      const dot = screen.getByText("Currently Active").querySelector("i");
      expect(dot).not.toBeNull();
      expect(dot).toHaveAttribute("aria-hidden", "true");
    });

    it("is not the shared Pill (it has its own ripple and tokens)", () => {
      render(<IntroCard profile={makeProfile()} />);
      const cls = screen.getByText("Currently Active").className;
      expect(cls).toContain("--green-ink");
    });
  });

  describe("Open to chips", () => {
    it("renders one chip per availability entry, in order", () => {
      render(<IntroCard profile={makeProfile()} />);
      const list = screen.getByRole("list", { name: /open to/i });
      const chips = within(list).getAllByRole("listitem").map((li) => li.textContent);
      expect(chips).toEqual(["Internships", "Freelance", "Entry-level", "Remote"]);
    });

    it("shows a visible 'Open to' label", () => {
      render(<IntroCard profile={makeProfile()} />);
      expect(screen.getByText("Open to")).toBeInTheDocument();
    });

    it("omits the whole row when there is nothing to list", () => {
      render(<IntroCard profile={makeProfile({ openTo: [] })} />);
      expect(screen.queryByRole("list", { name: /open to/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Open to")).not.toBeInTheDocument();
    });

    it("renders a long list without dropping entries", () => {
      const many = Array.from({ length: 12 }, (_, i) => `Option ${i}`);
      render(<IntroCard profile={makeProfile({ openTo: many })} />);
      const list = screen.getByRole("list", { name: /open to/i });
      expect(within(list).getAllByRole("listitem")).toHaveLength(12);
    });

    describe("accent band (approved polish: the refined band)", () => {
      it("wraps the label and the chip list in ONE band", () => {
        render(<IntroCard profile={makeProfile()} />);
        const band = screen.getByTestId("open-to");
        expect(band).toContainElement(screen.getByText("Open to"));
        expect(band).toContainElement(screen.getByRole("list", { name: /open to/i }));
      });

      it("keeps today's fill strength and outline: an arc gradient (17% down to 11%) ringed at 42%, radius 12", () => {
        // "Easily noticeable" was measured, not judged: at its weakest point this band is at least as far from the
        // card colour as the flat 13% band it replaces (dE 14.4 vs 13.3 dark, 11.2 vs 10.9 light).
        render(<IntroCard profile={makeProfile()} />);
        expect(screen.getByTestId("open-to")).toHaveClass(
          "rounded-[12px]",
          "px-[9px]",
          "py-[5px]",
          "bg-[image:linear-gradient(180deg,color-mix(in_oklab,var(--arc)_17%,transparent),color-mix(in_oklab,var(--arc)_11%,transparent))]",
          "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--arc)_42%,transparent),inset_0_1px_0_0_color-mix(in_oklab,#fff_26%,transparent)]",
        );
      });

      it("no longer uses the flat 13% fill it was polished from", () => {
        render(<IntroCard profile={makeProfile()} />);
        expect(screen.getByTestId("open-to").className).not.toContain("bg-[color-mix(in_oklab,var(--arc)_13%,transparent)]");
      });

      it("colours the label from the ink/arc mix (45% / 55%)", () => {
        render(<IntroCard profile={makeProfile()} />);
        expect(screen.getByText("Open to")).toHaveClass(
          "text-[color:color-mix(in_oklab,var(--color-text-primary)_45%,var(--arc)_55%)]",
        );
      });

      it("marks the label with the site's arc dot", () => {
        render(<IntroCard profile={makeProfile()} />);
        expect(screen.getByText("Open to")).toHaveClass(
          "inline-flex",
          "before:rounded-full",
          "before:bg-[var(--arc)]",
          "before:shadow-[0_0_7px_var(--arc)]",
        );
      });

      it("renders every chip in the accent tone: a 15% tint with no ring of its own", () => {
        render(<IntroCard profile={makeProfile()} />);
        const list = screen.getByRole("list", { name: /open to/i });
        for (const li of within(list).getAllByRole("listitem")) {
          expect(li.firstElementChild).toHaveClass("bg-[color-mix(in_oklab,var(--arc)_15%,transparent)]");
          expect(li.firstElementChild!.className).not.toMatch(/\bring-/);
        }
      });

      it("keeps the band out of the accessibility tree as a landmark (a div, not a region)", () => {
        render(<IntroCard profile={makeProfile()} />);
        expect(screen.getByTestId("open-to").tagName).toBe("DIV");
        expect(screen.getByTestId("open-to")).not.toHaveAttribute("role");
      });
    });
  });
});
