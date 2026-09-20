import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "./Chip";

/**
 * `cn` is a plain class joiner with NO Tailwind conflict resolution, so a tone cannot be
 * layered on top of the neutral look via `className` — both `background-color` rules would
 * be emitted and the loser is decided by stylesheet order. The accent tone therefore has to
 * SWAP the neutral classes out, and these tests check they are absent, not just outnumbered.
 */
const NEUTRAL = [
  "bg-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)]",
  "ring-[var(--glass-border)]",
  "text-[var(--color-text-secondary)]",
];
const ACCENT = [
  "bg-[color-mix(in_oklab,var(--arc)_10%,transparent)]",
  "ring-inset",
  // `color:` hint: Tailwind cannot always tell a colour from a width in an arbitrary ring value.
  "ring-[color:color-mix(in_oklab,var(--arc)_36%,transparent)]",
  "text-[var(--color-text-primary)]",
];

describe("Chip", () => {
  it("renders its text", () => {
    render(<Chip>Internships</Chip>);
    expect(screen.getByText("Internships")).toBeInTheDocument();
  });

  describe("default tone (unchanged)", () => {
    it("has the neutral surface, ring and ink", () => {
      render(<Chip>Plain</Chip>);
      expect(screen.getByText("Plain")).toHaveClass(...NEUTRAL);
    });

    it("has none of the accent classes", () => {
      render(<Chip>Plain</Chip>);
      const el = screen.getByText("Plain");
      for (const cls of ACCENT) expect(el).not.toHaveClass(cls);
    });
  });

  describe('tone="accent"', () => {
    it("has the arc-tinted surface, an INSET arc ring, and primary ink", () => {
      render(<Chip tone="accent">Lit</Chip>);
      expect(screen.getByText("Lit")).toHaveClass(...ACCENT);
    });

    it("SWAPS the neutral classes out — they are absent, not merely overridden", () => {
      render(<Chip tone="accent">Lit</Chip>);
      const el = screen.getByText("Lit");
      for (const cls of NEUTRAL) expect(el).not.toHaveClass(cls);
    });

    it("is orthogonal to size: the compact metrics still apply", () => {
      render(
        <Chip tone="accent" size="sm">
          Small
        </Chip>,
      );
      expect(screen.getByText("Small")).toHaveClass("px-2", "text-[9.5px]");
      render(<Chip tone="accent">Medium</Chip>);
      expect(screen.getByText("Medium")).toHaveClass("px-3", "text-xs");
    });

    it("still accepts an extra className", () => {
      render(
        <Chip tone="accent" className="extra-hook">
          Hooked
        </Chip>,
      );
      expect(screen.getByText("Hooked")).toHaveClass("extra-hook");
    });
  });
});
