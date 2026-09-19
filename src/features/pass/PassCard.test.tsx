import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PassCard } from "./PassCard";
import { profile } from "@/content/profile";

/**
 * jsdom has no WebGL context and its IntersectionObserver mock never fires, so
 * this suite exercises the *decision* PassCard makes (which fallback reason it
 * shows), not the live canvas — the canvas is only mounted once the card comes
 * into view, which never happens here.
 */

function stubWebGL(available: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => (available ? ({} as RenderingContext) : null) as never,
  );
}

function stubReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("reduced-motion") ? reduce : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PassCard", () => {
  it("renders into the 'pass' bento area", () => {
    stubWebGL(false);
    stubReducedMotion(false);
    const { container } = render(<PassCard profile={profile} />);
    expect(container.querySelector("[data-bento-area='pass']")).not.toBeNull();
  });

  it("keeps the card unpadded so the canvas can bleed to the edges", () => {
    stubWebGL(false);
    stubReducedMotion(false);
    const { container } = render(<PassCard profile={profile} />);
    const card = container.querySelector<HTMLElement>("[data-bento-area='pass']");
    expect(card?.className).not.toMatch(/\bp-5\b/);
  });

  it("shows the 2D fallback when there is no WebGL context", () => {
    stubWebGL(false);
    stubReducedMotion(false);
    const { container } = render(<PassCard profile={profile} />);
    expect(container.querySelector("[data-pass-fallback-reason='no-webgl']")).not.toBeNull();
  });

  it("does NOT fall back to 2D under reduced motion — it takes the 3D path (offscreen here)", () => {
    stubWebGL(true);
    stubReducedMotion(true);
    const { container } = render(<PassCard profile={profile} />);
    // reduced-motion no longer forces the flat card: the reason is 'offscreen'
    // (would mount the static hologram once in view), never 'no-webgl'.
    expect(container.querySelector("[data-pass-fallback-reason='no-webgl']")).toBeNull();
    expect(container.querySelector("[data-pass-fallback-reason='offscreen']")).not.toBeNull();
  });

  it("shows the badge caption", () => {
    stubWebGL(false);
    stubReducedMotion(false);
    render(<PassCard profile={profile} />);
    expect(screen.getByText(profile.badge.caption)).toBeInTheDocument();
  });

  it("shows the real badge copy from the profile", () => {
    stubWebGL(false);
    stubReducedMotion(false);
    render(<PassCard profile={profile} />);
    expect(screen.getByText("Myre Lector")).toBeInTheDocument();
    expect(screen.getByText("CS Student · Mobile Dev")).toBeInTheDocument();
    expect(screen.getByText("DLSL-2026")).toBeInTheDocument();
  });

  it("does not mount the 3D canvas while the card is off-screen", async () => {
    stubWebGL(true);
    stubReducedMotion(false);
    const { container } = render(<PassCard profile={profile} />);
    await waitFor(() => {
      expect(container.querySelector("[data-pass-variant='static']")).not.toBeNull();
    });
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("[data-pass-fallback-reason='offscreen']")).not.toBeNull();
  });

  it("renders without throwing for empty badge copy", () => {
    stubWebGL(false);
    stubReducedMotion(false);
    const emptied = {
      ...profile,
      badge: { title: "", subtitle: "", idLabel: "", caption: "" },
    };
    expect(() => render(<PassCard profile={emptied} />)).not.toThrow();
  });
});
