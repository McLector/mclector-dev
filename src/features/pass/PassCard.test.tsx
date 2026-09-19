import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PassCard } from "./PassCard";
import { profile } from "@/content/profile";

/**
 * Note: this suite never mounts the real WebGL canvas. jsdom has no GL
 * context, so the branch under test is the *decision* — which of the two
 * renditions PassCard picks — plus the code-splitting boundary. Whether the
 * badge swings is not, and cannot be, a jsdom assertion.
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

  it("renders the static badge when there is no WebGL context", () => {
    stubWebGL(false);
    stubReducedMotion(false);
    const { container } = render(<PassCard profile={profile} />);
    expect(container.querySelector("[data-pass-variant='static']")).not.toBeNull();
    expect(container.querySelector("[data-pass-fallback-reason='no-webgl']")).not.toBeNull();
  });

  it("renders the static badge under prefers-reduced-motion even with WebGL", () => {
    stubWebGL(true);
    stubReducedMotion(true);
    const { container } = render(<PassCard profile={profile} />);
    expect(container.querySelector("[data-pass-fallback-reason='reduced-motion']")).not.toBeNull();
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
    // The default IntersectionObserver polyfill in test/setup.ts never fires,
    // so the card is treated as never having come into view.
    const { container } = render(<PassCard profile={profile} />);
    await waitFor(() => {
      expect(container.querySelector("[data-pass-variant='static']")).not.toBeNull();
    });
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("[data-pass-fallback-reason='offscreen']")).not.toBeNull();
  });

  it("renders the pass-theme switcher with the default world selected", () => {
    stubWebGL(false);
    stubReducedMotion(false);
    render(<PassCard profile={profile} />);
    const nebula = screen.getByRole("radio", { name: "Nebula" });
    expect(nebula).toHaveAttribute("aria-checked", "true");
    // Every other world is present and unselected.
    expect(screen.getByRole("radio", { name: "Aurora" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("moves the selection when another pass theme is picked", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    stubWebGL(false);
    stubReducedMotion(false);
    render(<PassCard profile={profile} />);

    await user.click(screen.getByRole("radio", { name: "Solar" }));

    expect(screen.getByRole("radio", { name: "Solar" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Nebula" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
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
