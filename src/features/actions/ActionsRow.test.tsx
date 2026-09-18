import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Profile } from "@/content/types";
import { ActionsRow } from "./ActionsRow";

function makeProfile(cv: Profile["cv"]): Profile {
  return {
    handle: "@TestHandle",
    displayName: "Test Person",
    headline: ["Hello!", "I'm Test Person"],
    bioLead: "Lead.",
    bioRest: "Rest.",
    avatar: {
      alt: "Test Person",
      placeholder: { kind: "monogram", seed: "TP", from: "#000", to: "#fff" },
    },
    badge: { title: "T", subtitle: "S", idLabel: "ID", caption: "C" },
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
    cv,
    availability: "open-to-internship",
  };
}

const unavailable = makeProfile({ label: "CV", available: false });
const availableCv = makeProfile({
  label: "CV",
  available: true,
  href: "/files/cv.pdf",
});

describe("ActionsRow", () => {
  it("renders inside the actions bento area", () => {
    const { container } = render(
      <ActionsRow profile={unavailable} onContact={() => {}} />,
    );
    expect(container.querySelectorAll('[data-bento-area="actions"]')).toHaveLength(1);
  });

  it("exposes accessible names for both actions", () => {
    render(<ActionsRow profile={availableCv} onContact={() => {}} />);
    expect(screen.getByRole("button", { name: "Contact me" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CV" })).toBeInTheDocument();
  });

  it("calls onContact exactly once per click", async () => {
    const user = userEvent.setup();
    const onContact = vi.fn();
    render(<ActionsRow profile={unavailable} onContact={onContact} />);

    await user.click(screen.getByRole("button", { name: "Contact me" }));
    expect(onContact).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Contact me" }));
    expect(onContact).toHaveBeenCalledTimes(2);
  });

  it("does not call onContact on render", () => {
    const onContact = vi.fn();
    render(<ActionsRow profile={unavailable} onContact={onContact} />);
    expect(onContact).not.toHaveBeenCalled();
  });

  describe("when the CV is unavailable", () => {
    it("still renders the CV control, visibly disabled", () => {
      render(<ActionsRow profile={unavailable} onContact={() => {}} />);
      const cv = screen.getByRole("button", { name: "CV" });
      expect(cv).toBeDisabled();
      expect(cv).toHaveAttribute("aria-disabled", "true");
      expect(cv).toHaveAttribute("title", expect.stringMatching(/coming soon/i));
    });

    it("is not a link and has no href to navigate to", () => {
      render(<ActionsRow profile={unavailable} onContact={() => {}} />);
      expect(screen.queryByRole("link", { name: "CV" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "CV" })).not.toHaveAttribute("href");
    });

    it("dispatches no click and takes no focus when clicked", async () => {
      const user = userEvent.setup();
      const onContact = vi.fn();
      const clicks = vi.fn();
      render(
        <div onClick={clicks}>
          <ActionsRow profile={unavailable} onContact={onContact} />
        </div>,
      );

      const cv = screen.getByRole("button", { name: "CV" });
      await user.click(cv);

      expect(clicks).not.toHaveBeenCalled();
      expect(onContact).not.toHaveBeenCalled();
      expect(cv).not.toHaveFocus();
    });
  });

  describe("when the CV is available", () => {
    it("renders a real link to the href", () => {
      render(<ActionsRow profile={availableCv} onContact={() => {}} />);
      const link = screen.getByRole("link", { name: "CV" });
      expect(link).toHaveAttribute("href", "/files/cv.pdf");
    });

    it("opens in a new tab with a safe rel", () => {
      render(<ActionsRow profile={availableCv} onContact={() => {}} />);
      const link = screen.getByRole("link", { name: "CV" });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("is not marked disabled", () => {
      render(<ActionsRow profile={availableCv} onContact={() => {}} />);
      expect(screen.getByRole("link", { name: "CV" })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("falls back to the disabled control when href is missing", () => {
      const noHref = makeProfile({ label: "CV", available: true });
      render(<ActionsRow profile={noHref} onContact={() => {}} />);
      expect(screen.queryByRole("link", { name: "CV" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "CV" })).toBeDisabled();
    });

    it("uses the cv label as the accessible name", () => {
      const custom = makeProfile({
        label: "Résumé",
        available: true,
        href: "/files/cv.pdf",
      });
      render(<ActionsRow profile={custom} onContact={() => {}} />);
      expect(screen.getByRole("link", { name: "Résumé" })).toBeInTheDocument();
    });
  });
});
