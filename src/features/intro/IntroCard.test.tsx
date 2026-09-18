import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
    availability: "open-to-internship",
    ...overrides,
  };
}

describe("IntroCard", () => {
  it("renders inside the intro bento area", () => {
    const { container } = render(<IntroCard profile={makeProfile()} />);
    expect(container.querySelectorAll('[data-bento-area="intro"]')).toHaveLength(1);
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
});
