import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { Profile } from "@/content/types";
import { LocationCard } from "./LocationCard";

function fixture(
  overrides: Partial<Profile["location"]> = {},
): Profile["location"] {
  return {
    city: "Batangas",
    country: "PH",
    timeZone: "Asia/Manila",
    utcLabel: "GMT+8",
    mapTexture: {
      alt: "Map of Batangas, Philippines",
      placeholder: {
        kind: "pattern",
        seed: "batangas-ph",
        from: "#161622",
        to: "#0a0a0f",
      },
    },
    ...overrides,
  };
}

describe("LocationCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:40:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders inside the 'place' bento area", () => {
    const { container } = render(<LocationCard location={fixture()} />);
    expect(container.querySelector('[data-bento-area="place"]')).not.toBeNull();
  });

  it("renders city and country", () => {
    render(<LocationCard location={fixture()} />);
    expect(screen.getByText("Batangas, PH")).toBeInTheDocument();
  });

  it("renders the UTC label alongside the timezone city", () => {
    render(<LocationCard location={fixture()} />);
    expect(screen.getByText("GMT+8 · Manila")).toBeInTheDocument();
  });

  it("renders the live local time for the given zone, down to the second", () => {
    render(<LocationCard location={fixture()} />);
    const clock = screen.getByTestId("local-clock");
    expect(clock).toHaveTextContent("18:40");
    expect(clock.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("ticks the seconds every second", () => {
    render(<LocationCard location={fixture()} />);
    expect(screen.getByTestId("local-clock")).toHaveTextContent("18:40:00");

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("local-clock")).toHaveTextContent("18:40:05");
  });

  it("updates the displayed clock as fake time advances", () => {
    render(<LocationCard location={fixture()} />);
    expect(screen.getByTestId("local-clock")).toHaveTextContent("18:40");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByTestId("local-clock")).toHaveTextContent("18:41");

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });
    expect(screen.getByTestId("local-clock")).toHaveTextContent("18:44");
  });

  it("renders a status dot", () => {
    render(<LocationCard location={fixture()} />);
    expect(screen.getByTestId("location-status-dot")).toBeInTheDocument();
  });

  describe("centred layout", () => {
    it("centres the content on the card's vertical centre line", () => {
      render(<LocationCard location={fixture()} />);
      expect(screen.getByTestId("location-content")).toHaveClass("items-center", "text-center");
    });

    it("centres the city row (dot + name) as one unit", () => {
      render(<LocationCard location={fixture()} />);
      const row = screen.getByTestId("location-status-dot").parentElement;
      expect(row).toHaveClass("justify-center");
    });

    it("pulls the eyebrow back by its trailing letter-spacing, so the VISIBLE text is what sits on the axis", () => {
      render(<LocationCard location={fixture()} />);
      // .eyebrow letter-spacing is 0.2em, which leaves that much empty space after the last glyph.
      expect(screen.getByText("GMT+8 · Manila")).toHaveClass("-mr-[0.2em]");
    });

    it("aims the map layer and the accent wash at the horizontal centre, not the left/right", () => {
      render(<LocationCard location={fixture()} />);
      expect(screen.getByTestId("map-placeholder").style.backgroundImage).toContain("at 50% 12%");
      expect(screen.getByTestId("location-wash").style.backgroundImage).toContain("at 50% 0%");
    });

    it("keeps the wash decorative (aria-hidden) like the map layer", () => {
      render(<LocationCard location={fixture()} />);
      expect(screen.getByTestId("location-wash")).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("mapTexture placeholder", () => {
    it("renders no <img> at all when mapTexture.src is undefined (the v1 state)", () => {
      const { container } = render(<LocationCard location={fixture()} />);

      expect(container.querySelector("img")).toBeNull();
      expect(screen.queryByRole("img")).toBeNull();
    });

    it("paints the placeholder's from/to colors as a CSS gradient", () => {
      const { container } = render(<LocationCard location={fixture()} />);
      const layer = container.querySelector<HTMLElement>(
        '[data-testid="map-placeholder"]',
      );

      expect(layer).not.toBeNull();
      // jsdom normalises hex colors to rgb() when reparsing the style value,
      // so match on the parsed form of #161622 / #0a0a0f.
      expect(layer?.style.backgroundImage).toMatch(/gradient\(/);
      expect(layer?.style.backgroundImage).toContain("rgb(22, 22, 34)");
      expect(layer?.style.backgroundImage).toContain("rgb(10, 10, 15)");
    });

    it("still renders the placeholder when the src is an empty string", () => {
      const location = fixture();
      location.mapTexture.src = "";
      const { container } = render(<LocationCard location={location} />);

      expect(container.querySelector("img")).toBeNull();
      expect(screen.getByTestId("map-placeholder")).toBeInTheDocument();
    });

    it("exposes the placeholder decoratively (aria-hidden), not as content", () => {
      render(<LocationCard location={fixture()} />);
      expect(screen.getByTestId("map-placeholder")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });
  });

  describe("edge cases", () => {
    it("falls back to UTC for an invalid time zone without throwing", () => {
      expect(() =>
        render(<LocationCard location={fixture({ timeZone: "Not/AZone" })} />),
      ).not.toThrow();
      expect(screen.getByTestId("local-clock")).toHaveTextContent("10:40");
    });

    it("renders long city names without crashing", () => {
      render(
        <LocationCard
          location={fixture({ city: "Llanfairpwllgwyngyllgogerychwyrndrobwll" })}
        />,
      );
      expect(
        screen.getByText("Llanfairpwllgwyngyllgogerychwyrndrobwll, PH"),
      ).toBeInTheDocument();
    });

    it("renders empty city/country strings as a bare separator, not a crash", () => {
      expect(() =>
        render(<LocationCard location={fixture({ city: "", country: "" })} />),
      ).not.toThrow();
    });
  });

  describe("cleanup", () => {
    it("clears the clock interval on unmount", () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      const { unmount } = render(<LocationCard location={fixture()} />);

      expect(vi.getTimerCount()).toBe(1);
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("logs no state-update-after-unmount warning when time advances post-unmount", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { unmount } = render(<LocationCard location={fixture()} />);

      unmount();
      act(() => {
        vi.advanceTimersByTime(600_000);
      });

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
