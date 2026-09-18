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
] as const;

describe("App", () => {
  it("renders every bento area exactly once", () => {
    render(<App />);
    for (const area of AREAS) {
      const nodes = document.querySelectorAll(`[data-bento-area="${area}"]`);
      expect(nodes, `area "${area}"`).toHaveLength(1);
    }
  });

  it("does not render the contact dialog until opened", () => {
    render(<App />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
