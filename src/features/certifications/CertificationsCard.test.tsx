import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Certification } from "@/content/types";
import { CertificationsCard } from "./CertificationsCard";

/**
 * Stream G — the certifications card ships with an EMPTY content array in
 * v1 (see src/content/certifications.ts), so the 0-item render is the real
 * production state and gets the same test weight as the populated ones.
 */

const one: Certification[] = [
  {
    id: "cs50x",
    title: "CS50x: Introduction to Computer Science",
    issuer: "HarvardX",
    issued: "2025",
    credentialUrl: "https://example.com/cs50x",
    status: "earned",
  },
];

const six: Certification[] = [
  { id: "a", title: "Cert A", issuer: "Issuer A", status: "earned", credentialUrl: "https://example.com/a" },
  { id: "b", title: "Cert B", issuer: "Issuer B", status: "in-progress" },
  { id: "c", title: "Cert C", issuer: "Issuer C", status: "planned" },
  { id: "d", title: "Cert D", issuer: "Issuer D", status: "earned" },
  { id: "e", title: "Cert E", issuer: "Issuer E", status: "in-progress" },
  { id: "f", title: "Cert F", issuer: "Issuer F", status: "planned" },
];

describe("CertificationsCard", () => {
  it("renders inside the certifications bento area", () => {
    const { container } = render(<CertificationsCard certifications={[]} />);
    expect(container.querySelector('[data-bento-area="certifications"]')).not.toBeNull();
  });

  it("always renders the card heading", () => {
    render(<CertificationsCard certifications={one} />);
    expect(screen.getByRole("heading", { name: /certifications/i })).toBeInTheDocument();
  });

  describe("0 items — the designed empty state (v1 shipped state)", () => {
    it("renders the coming-soon empty state, not a blank card", () => {
      render(<CertificationsCard certifications={[]} />);
      const empty = screen.getByTestId("certifications-empty");
      expect(empty).toBeInTheDocument();
      expect(within(empty).getByText(/coming soon/i)).toBeInTheDocument();
      expect(
        screen.getByText(/reserved/i),
      ).toBeInTheDocument();
    });

    it("uses a dashed placeholder so the slot reads as planned, not missing", () => {
      render(<CertificationsCard certifications={[]} />);
      expect(screen.getByTestId("certifications-empty").className).toMatch(/border-dashed/);
    });

    it("renders no list and no rows when there is nothing to list", () => {
      render(<CertificationsCard certifications={[]} />);
      expect(screen.queryByTestId("certifications-list")).not.toBeInTheDocument();
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    });
  });

  describe("1 item", () => {
    it("renders exactly one row with title, issuer and status", () => {
      render(<CertificationsCard certifications={one} />);
      const rows = screen.getAllByRole("listitem");
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(within(row).getByText("CS50x: Introduction to Computer Science")).toBeInTheDocument();
      expect(within(row).getByText(/HarvardX/)).toBeInTheDocument();
      expect(within(row).getByText("Earned")).toBeInTheDocument();
    });

    it("hides the empty state once there is at least one certification", () => {
      render(<CertificationsCard certifications={one} />);
      expect(screen.queryByTestId("certifications-empty")).not.toBeInTheDocument();
    });
  });

  describe("6 items", () => {
    it("renders all six rows", () => {
      render(<CertificationsCard certifications={six} />);
      expect(screen.getAllByRole("listitem")).toHaveLength(6);
      for (const cert of six) {
        expect(screen.getByText(cert.title)).toBeInTheDocument();
      }
    });

    it("contains overflow inside the card so the fixed desktop grid never blows out", () => {
      render(<CertificationsCard certifications={six} />);
      const list = screen.getByTestId("certifications-list");
      expect(list.className).toMatch(/overflow-y-auto/);
      // jsdom's cssstyle drops rem-valued max-height from computed style, so
      // assert the declared inline style instead of the computed one.
      expect(list.getAttribute("style")).toMatch(/max-height:\s*12rem/);
    });
  });

  describe("credential links", () => {
    it("renders a row with credentialUrl as a link pointing at that URL", () => {
      render(<CertificationsCard certifications={one} />);
      const link = screen.getByRole("link", {
        name: /CS50x: Introduction to Computer Science/i,
      });
      expect(link).toHaveAttribute("href", "https://example.com/cs50x");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });

    it("renders a row without credentialUrl as non-interactive text", () => {
      const noUrl: Certification[] = [
        { id: "x", title: "Unlinked Cert", issuer: "Issuer X", status: "planned" },
      ];
      render(<CertificationsCard certifications={noUrl} />);
      const row = screen.getByRole("listitem");
      expect(within(row).queryByRole("link")).not.toBeInTheDocument();
      expect(row.querySelector("a")).toBeNull();
      expect(within(row).getByText("Unlinked Cert")).toBeInTheDocument();
    });

    it("only links the rows that actually have a credential URL", () => {
      render(<CertificationsCard certifications={six} />);
      expect(screen.getAllByRole("link")).toHaveLength(1);
    });
  });

  describe("status is conveyed by text, not colour alone (WCAG 1.4.1)", () => {
    const cases: Array<[Certification["status"], string]> = [
      ["earned", "Earned"],
      ["in-progress", "In progress"],
      ["planned", "Planned"],
    ];

    for (const [status, label] of cases) {
      it(`labels a ${status} certification "${label}" in text`, () => {
        render(
          <CertificationsCard
            certifications={[{ id: status, title: `T ${status}`, issuer: "Iss", status }]}
          />,
        );
        const row = screen.getByRole("listitem");
        const pill = within(row).getByTestId(`certification-status-${status}`);
        expect(pill).toHaveTextContent(label);
        // The pill's full text (including its visually hidden prefix) must
        // name the status, so a screen reader never depends on the colour.
        expect(pill.parentElement?.textContent).toBe(`Status: ${label}`);
      });
    }

    it("gives each status a distinct pill tone without relying on it for meaning", () => {
      render(<CertificationsCard certifications={six} />);
      const earned = screen.getAllByTestId("certification-status-earned")[0];
      const inProgress = screen.getAllByTestId("certification-status-in-progress")[0];
      const planned = screen.getAllByTestId("certification-status-planned")[0];
      const toneOf = (el: HTMLElement) => el.parentElement?.className ?? "";
      expect(toneOf(earned)).not.toBe(toneOf(inProgress));
      expect(toneOf(inProgress)).not.toBe(toneOf(planned));
    });
  });

  describe("issued date", () => {
    it("renders the issued year when present", () => {
      render(<CertificationsCard certifications={one} />);
      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });

    it("omits the separator when issued is absent", () => {
      render(
        <CertificationsCard
          certifications={[{ id: "n", title: "No date", issuer: "Iss", status: "planned" }]}
        />,
      );
      const row = screen.getByRole("listitem");
      expect(row.textContent).not.toMatch(/·\s*$/);
    });
  });
});
