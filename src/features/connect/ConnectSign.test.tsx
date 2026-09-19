import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectSign } from "./ConnectSign";

const EMAIL = "moradamyre@gmail.com";

describe("ConnectSign", () => {
  it("is a single mailto link to the given address", () => {
    render(<ConnectSign email={EMAIL} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
  });

  it("shows 'Let's Connect' and the address as visible text", () => {
    render(<ConnectSign email={EMAIL} />);
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent(/let's connect/i);
    expect(link).toHaveTextContent(EMAIL);
  });

  it("lets the visible text be the accessible name (no aria-label override)", () => {
    render(<ConnectSign email={EMAIL} />);
    const link = screen.getByRole("link", { name: /let's connect.*moradamyre@gmail\.com/i });
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

  it("does not open a new tab (mailto stays in the page)", () => {
    render(<ConnectSign email={EMAIL} />);
    expect(screen.getByRole("link")).not.toHaveAttribute("target");
  });

  it("renders nothing rather than a dead link when there is no address", () => {
    const { container } = render(<ConnectSign email="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps an unusual but valid address intact", () => {
    render(<ConnectSign email="first.last+tag@sub.example.co.uk" />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "mailto:first.last+tag@sub.example.co.uk",
    );
  });
});
