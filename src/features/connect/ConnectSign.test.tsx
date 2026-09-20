import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectSign } from "./ConnectSign";

const EMAIL = "moradamyre@gmail.com";
const COMPOSE = "https://mail.google.com/mail/?view=cm&fs=1&to=moradamyre%40gmail.com";

describe("ConnectSign", () => {
  it("is a single link that opens Gmail compose addressed to the given address", () => {
    render(<ConnectSign email={EMAIL} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", COMPOSE);
  });

  it("is not a mailto: link — that hands off to whatever mail app the OS has, often none", () => {
    render(<ConnectSign email={EMAIL} />);
    expect(screen.getByRole("link").getAttribute("href")).not.toMatch(/^mailto:/i);
  });

  it("shows 'Let's Connect' and the address as visible text", () => {
    render(<ConnectSign email={EMAIL} />);
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent(/let's connect/i);
    expect(link).toHaveTextContent(EMAIL);
  });

  it("names the link with its visible text plus where it goes — spaced, not run together", () => {
    render(<ConnectSign email={EMAIL} />);
    // Exact string on purpose: a missing text node between the address and the hint would
    // read "…gmail.com(opens Gmail…" to a screen reader.
    const link = screen.getByRole("link", {
      name: "Let's Connect moradamyre@gmail.com (opens Gmail compose in a new tab)",
    });
    expect(link).not.toHaveAttribute("aria-label");
  });

  it("hides the decorative arrow from assistive tech", () => {
    render(<ConnectSign email={EMAIL} />);
    const arrow = screen.getByRole("link").querySelector("[aria-hidden='true']");
    expect(arrow).not.toBeNull();
    expect(arrow).toHaveTextContent("→");
  });

  it("carries the connect bento area exactly once and is not a glass card", () => {
    const { container } = render(<ConnectSign email={EMAIL} />);
    expect(container.querySelectorAll('[data-bento-area="connect"]')).toHaveLength(1);
    // BentoCard is overflow-hidden and would clip the sign's outer glow.
    expect(container.querySelector('[data-bento-area="connect"]')?.className).not.toMatch(
      /overflow-hidden/,
    );
  });

  it("opens in a new tab, and cannot reach back into this page", () => {
    render(<ConnectSign email={EMAIL} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders nothing rather than a dead link when there is no address", () => {
    const { container } = render(<ConnectSign email="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a whitespace-only address either (it would encode to an empty link)", () => {
    const { container } = render(<ConnectSign email="   " />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps an unusual but valid address intact: encoded in the link, raw in the text", () => {
    render(<ConnectSign email="first.last+tag@sub.example.co.uk" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "https://mail.google.com/mail/?view=cm&fs=1&to=first.last%2Btag%40sub.example.co.uk",
    );
    expect(link).toHaveTextContent("first.last+tag@sub.example.co.uk");
  });
});
