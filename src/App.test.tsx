import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

const AREAS = [
  "intro",
  "skills",
  "pass",
  "social",
  "place",
  "work",
  "certifications",
  "actions",
  "connect",
] as const;

describe("App", () => {
  it("renders every bento area exactly once", () => {
    render(<App />);
    for (const area of AREAS) {
      const nodes = document.querySelectorAll(`[data-bento-area="${area}"]`);
      expect(nodes, `area "${area}"`).toHaveLength(1);
    }
  });

  it("has no contact form or 'Contact me' control — the sign's mailto is the contact path", () => {
    render(<App />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /contact me/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /let's connect/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
  });

  it("lays the centre column out as sign → stage → Download CV", () => {
    render(<App />);
    const order = (a: string, b: string) =>
      document
        .querySelector(`[data-bento-area="${a}"]`)!
        .compareDocumentPosition(document.querySelector(`[data-bento-area="${b}"]`)!) &
      Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order("connect", "pass")).toBeTruthy();
    expect(order("pass", "actions")).toBeTruthy();
    const center = document.querySelector(".bento__col--center")!;
    expect(center.querySelector('[data-bento-area="connect"]')).not.toBeNull();
    expect(center.querySelector('[data-bento-area="actions"]')).not.toBeNull();
  });

  it("keeps the left column to intro, skills and place", () => {
    render(<App />);
    const left = document.querySelectorAll(".bento__col")[0];
    const areas = [...left.children].map((c) => c.getAttribute("data-bento-area"));
    expect(areas).toEqual(["intro", "skills", "place"]);
  });

  it("titles the social card 'Contact & Socials'", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Contact & Socials" })).toBeInTheDocument();
    expect(screen.queryByText("Elsewhere")).not.toBeInTheDocument();
  });
});
