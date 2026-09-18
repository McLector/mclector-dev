import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeFallback } from "./BadgeFallback";
import { initialsFrom } from "./textures/badgeFaceTexture";
import type { Profile } from "@/content/types";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    handle: "@McLector",
    displayName: "Myre Lector",
    headline: ["Hello!", "I'm Myre Lector"],
    bioLead: "lead",
    bioRest: "rest",
    avatar: {
      alt: "Myre Lector",
      placeholder: { kind: "monogram", seed: "ML", from: "#4f7cff", to: "#b34fff" },
    },
    badge: {
      title: "Myre Lector",
      subtitle: "CS Student · Mobile Dev",
      idLabel: "DLSL-2026",
      caption: "Digital Pass",
    },
    location: {
      city: "Batangas",
      country: "PH",
      timeZone: "Asia/Manila",
      utcLabel: "GMT+8",
      mapTexture: {
        alt: "map",
        placeholder: { kind: "pattern", seed: "b", from: "#000", to: "#111" },
      },
    },
    email: "someone@example.com",
    cv: { label: "CV", available: false },
    availability: "open-to-internship",
    ...overrides,
  };
}

describe("BadgeFallback", () => {
  it("renders the badge copy from the profile", () => {
    render(<BadgeFallback profile={makeProfile()} />);
    expect(screen.getByText("Myre Lector")).toBeInTheDocument();
    expect(screen.getByText("CS Student · Mobile Dev")).toBeInTheDocument();
    expect(screen.getByText("DLSL-2026")).toBeInTheDocument();
    expect(screen.getByText("Digital Pass")).toBeInTheDocument();
  });

  it("exposes one accessible group labelled for screen readers", () => {
    render(<BadgeFallback profile={makeProfile()} />);
    const group = screen.getByRole("img", { name: /myre lector/i });
    expect(group).toBeInTheDocument();
  });

  it("draws a monogram when the avatar has no src", () => {
    const profile = makeProfile();
    render(<BadgeFallback profile={profile} />);
    expect(screen.getByText(initialsFrom(profile.displayName))).toBeInTheDocument();
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });

  it("renders the avatar image when a src exists, with the profile's alt text", () => {
    const profile = makeProfile();
    profile.avatar = { ...profile.avatar, src: "/me.png" };
    render(<BadgeFallback profile={profile} />);
    const img = screen.getByAltText("Myre Lector");
    expect(img).toHaveAttribute("src", "/me.png");
    expect(screen.queryByText("ML")).not.toBeInTheDocument();
  });

  it("uses the placeholder accent colours for the badge surface", () => {
    const profile = makeProfile();
    const { container } = render(<BadgeFallback profile={profile} />);
    const surface = container.querySelector<HTMLElement>("[data-badge-surface]");
    expect(surface).not.toBeNull();
    // jsdom normalises hex colours to rgb() when reparsing the style attribute.
    expect(surface!.style.backgroundImage).toContain("rgb(79, 124, 255)");
    expect(surface!.style.backgroundImage).toContain("rgb(179, 79, 255)");
  });

  it("does not throw on an empty display name and still shows a monogram", () => {
    const profile = makeProfile({ displayName: "   " });
    expect(() => render(<BadgeFallback profile={profile} />)).not.toThrow();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders empty badge strings without leaking an empty element into a11y", () => {
    const profile = makeProfile();
    profile.badge = { title: "", subtitle: "", idLabel: "", caption: "" };
    expect(() => render(<BadgeFallback profile={profile} />)).not.toThrow();
  });

  it("marks itself as the static variant so tests and e2e can distinguish it", () => {
    const { container } = render(<BadgeFallback profile={makeProfile()} />);
    expect(container.querySelector("[data-pass-variant='static']")).not.toBeNull();
  });

  it("takes a reason prop that annotates why the 3D scene was skipped", () => {
    const { container } = render(
      <BadgeFallback profile={makeProfile()} reason="reduced-motion" />,
    );
    expect(
      container.querySelector("[data-pass-fallback-reason='reduced-motion']"),
    ).not.toBeNull();
  });

  it("truncates an absurdly long title with CSS rather than overflowing", () => {
    const profile = makeProfile();
    profile.badge = {
      ...profile.badge,
      title: "Bartholomew Maximilian Featherstonehaugh-Wetherby III, Esq.",
    };
    const { container } = render(<BadgeFallback profile={profile} />);
    const title = container.querySelector<HTMLElement>("[data-badge-title]");
    expect(title).not.toBeNull();
    expect(title!.className).toMatch(/truncate|line-clamp/);
  });
});
