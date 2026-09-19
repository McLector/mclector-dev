import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Profile } from "@/content/types";
import { ActionsRow } from "./ActionsRow";

const LABEL = "Download CV";

function makeProfile(cv: Profile["cv"]): Profile {
  return {
    handle: "@TestHandle",
    displayName: "Test Person",
    headline: ["Hello!", "I'm Test Person"],
    bioLead: "Lead.",
    bioRest: "Rest.",
    openTo: ["Internships"],
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
  };
}

const unavailable = makeProfile({ label: LABEL, available: false });
const availableCv = makeProfile({
  label: LABEL,
  available: true,
  href: "/files/cv.pdf",
});

describe("ActionsRow", () => {
  it("renders inside the actions bento area", () => {
    const { container } = render(<ActionsRow profile={unavailable} />);
    expect(container.querySelectorAll('[data-bento-area="actions"]')).toHaveLength(1);
  });

  it("no longer offers a Contact me action — the CV is the only control", () => {
    render(<ActionsRow profile={availableCv} />);
    expect(screen.queryByRole("button", { name: /contact me/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("centres the control under the stage", () => {
    const { container } = render(<ActionsRow profile={unavailable} />);
    const row = container.querySelector('[data-bento-area="actions"] > div');
    expect(row).not.toBeNull();
    expect(row).toHaveClass("justify-center");
  });

  it("draws a decorative download icon that does not change the accessible name", () => {
    render(<ActionsRow profile={unavailable} />);
    const cv = screen.getByRole("button", { name: LABEL });
    const icon = cv.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  describe("when the CV is unavailable", () => {
    it("still renders the CV control, visibly disabled", () => {
      render(<ActionsRow profile={unavailable} />);
      const cv = screen.getByRole("button", { name: LABEL });
      expect(cv).toBeDisabled();
      expect(cv).toHaveAttribute("aria-disabled", "true");
      expect(cv).toHaveAttribute("title", expect.stringMatching(/coming soon/i));
    });

    it("takes its surface and dimming from the theme tokens, not hard-coded colours", () => {
      render(<ActionsRow profile={unavailable} />);
      const cls = screen.getByRole("button", { name: LABEL }).className;
      expect(cls).toContain("--cv-bg");
      expect(cls).toContain("--cv-fg");
      expect(cls).toContain("--cv-dis");
    });

    it("is not a link and has no href to navigate to", () => {
      render(<ActionsRow profile={unavailable} />);
      expect(screen.queryByRole("link", { name: LABEL })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: LABEL })).not.toHaveAttribute("href");
    });

    it("dispatches no click and takes no focus when clicked", async () => {
      const user = userEvent.setup();
      const clicks = { count: 0 };
      render(
        <div onClick={() => (clicks.count += 1)}>
          <ActionsRow profile={unavailable} />
        </div>,
      );

      const cv = screen.getByRole("button", { name: LABEL });
      await user.click(cv);

      expect(clicks.count).toBe(0);
      expect(cv).not.toHaveFocus();
    });
  });

  describe("when the CV is available", () => {
    it("renders a real link to the href", () => {
      render(<ActionsRow profile={availableCv} />);
      const link = screen.getByRole("link", { name: LABEL });
      expect(link).toHaveAttribute("href", "/files/cv.pdf");
    });

    it("opens in a new tab with a safe rel", () => {
      render(<ActionsRow profile={availableCv} />);
      const link = screen.getByRole("link", { name: LABEL });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("uses the primary look (the mockup's live preview), not the dimmed placeholder", () => {
      render(<ActionsRow profile={availableCv} />);
      const cls = screen.getByRole("link", { name: LABEL }).className;
      expect(cls).toContain("--btn-bg");
      expect(cls).not.toContain("--cv-dis");
    });

    it("is not marked disabled", () => {
      render(<ActionsRow profile={availableCv} />);
      expect(screen.getByRole("link", { name: LABEL })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("falls back to the disabled control when href is missing", () => {
      const noHref = makeProfile({ label: LABEL, available: true });
      render(<ActionsRow profile={noHref} />);
      expect(screen.queryByRole("link", { name: LABEL })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: LABEL })).toBeDisabled();
    });

    it("uses the cv label as the accessible name", () => {
      const custom = makeProfile({
        label: "Résumé",
        available: true,
        href: "/files/cv.pdf",
      });
      render(<ActionsRow profile={custom} />);
      expect(screen.getByRole("link", { name: "Résumé" })).toBeInTheDocument();
    });
  });
});
