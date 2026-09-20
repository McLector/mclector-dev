import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PassCard } from "./PassCard";
import { profile } from "@/content/profile";
import { setMotion } from "@/lib/motion";

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // The Animations setting lives on <html>; leave it as a fresh visitor would find it.
  document.documentElement.removeAttribute("data-motion");
  localStorage.clear();
});

describe("PassCard", () => {
  it("renders into the 'pass' bento area", () => {
    stubWebGL(false);
    setMotion("on");
    const { container } = render(<PassCard profile={profile} />);
    expect(container.querySelector("[data-bento-area='pass']")).not.toBeNull();
  });

  it("keeps the card unpadded so the canvas can bleed to the edges", () => {
    stubWebGL(false);
    setMotion("on");
    const { container } = render(<PassCard profile={profile} />);
    const card = container.querySelector<HTMLElement>("[data-bento-area='pass']");
    expect(card?.className).not.toMatch(/\bp-5\b/);
  });

  it("shows the 2D fallback when there is no WebGL context", () => {
    stubWebGL(false);
    setMotion("on");
    const { container } = render(<PassCard profile={profile} />);
    expect(container.querySelector("[data-pass-fallback-reason='no-webgl']")).not.toBeNull();
  });

  it("does NOT fall back to 2D when animations are off — it takes the 3D path (offscreen here)", () => {
    stubWebGL(true);
    setMotion("off");
    const { container } = render(<PassCard profile={profile} />);
    // Animations off never forces the flat card: the reason is 'offscreen'
    // (would mount the static hologram once in view), never 'no-webgl'.
    expect(container.querySelector("[data-pass-fallback-reason='no-webgl']")).toBeNull();
    expect(container.querySelector("[data-pass-fallback-reason='offscreen']")).not.toBeNull();
  });

  it("shows the badge caption", () => {
    stubWebGL(false);
    setMotion("on");
    render(<PassCard profile={profile} />);
    expect(screen.getByText(profile.badge.caption)).toBeInTheDocument();
  });

  it("shows the real badge copy from the profile", () => {
    stubWebGL(false);
    setMotion("on");
    render(<PassCard profile={profile} />);
    expect(screen.getByText("Myre Lector")).toBeInTheDocument();
    expect(screen.getByText("CS Student · Mobile Dev")).toBeInTheDocument();
    expect(screen.getByText("DLSL-2026")).toBeInTheDocument();
  });

  it("does not mount the 3D canvas while the card is off-screen", async () => {
    stubWebGL(true);
    setMotion("on");
    const { container } = render(<PassCard profile={profile} />);
    await waitFor(() => {
      expect(container.querySelector("[data-pass-variant='static']")).not.toBeNull();
    });
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("[data-pass-fallback-reason='offscreen']")).not.toBeNull();
  });

  it("renders without throwing for empty badge copy", () => {
    stubWebGL(false);
    setMotion("on");
    const emptied = {
      ...profile,
      badge: { title: "", subtitle: "", idLabel: "", caption: "" },
    };
    expect(() => render(<PassCard profile={emptied} />)).not.toThrow();
  });
});
