import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { formatLocalTime, formatLocalTimeWithSeconds, useLocalClock } from "./time";

/**
 * Asia/Manila (the real content value) is UTC+8 year-round with no DST, so
 * every assertion below can hard-code an expected wall-clock string without
 * becoming flaky in June.
 */
describe("formatLocalTime", () => {
  it("formats a UTC instant into the target zone's wall clock", () => {
    expect(
      formatLocalTime("Asia/Manila", new Date("2026-01-15T10:40:00Z")),
    ).toBe("18:40");
  });

  it("applies the same +8 offset in January and in July (no DST in Manila)", () => {
    const winter = formatLocalTime("Asia/Manila", new Date("2026-01-15T02:15:00Z"));
    const summer = formatLocalTime("Asia/Manila", new Date("2026-07-15T02:15:00Z"));

    expect(winter).toBe("10:15");
    expect(summer).toBe("10:15");
    expect(winter).toBe(summer);
  });

  it("is 24-hour: no AM/PM marker, and afternoon hours exceed 12", () => {
    const afternoon = formatLocalTime("Asia/Manila", new Date("2026-01-15T13:05:00Z"));

    expect(afternoon).toBe("21:05");
    expect(afternoon).not.toMatch(/[ap]\.?m\.?/i);
  });

  it("always emits zero-padded HH:MM", () => {
    expect(formatLocalTime("Asia/Manila", new Date("2026-01-14T20:03:00Z"))).toBe(
      "04:03",
    );
    expect(
      formatLocalTime("Asia/Manila", new Date("2026-01-15T10:40:00Z")),
    ).toMatch(/^\d{2}:\d{2}$/);
  });

  describe("day-boundary rollover", () => {
    it("renders 23:59 on the last minute of the local day", () => {
      expect(
        formatLocalTime("Asia/Manila", new Date("2026-03-01T15:59:00Z")),
      ).toBe("23:59");
    });

    it("renders midnight as 00:xx, never 24:xx", () => {
      const justAfterMidnight = formatLocalTime(
        "Asia/Manila",
        new Date("2026-03-01T16:05:00Z"),
      );

      expect(justAfterMidnight).toBe("00:05");
      expect(justAfterMidnight).not.toMatch(/^24:/);
    });

    it("renders exact midnight as 00:00", () => {
      expect(
        formatLocalTime("Asia/Manila", new Date("2026-03-01T16:00:00Z")),
      ).toBe("00:00");
    });

    it("straddles the date line: one instant is 23:59 in UTC and next-day in Manila", () => {
      const instant = new Date("2026-03-01T23:59:00Z");

      expect(formatLocalTime("UTC", instant)).toBe("23:59");
      expect(formatLocalTime("Asia/Manila", instant)).toBe("07:59");
    });
  });

  describe("invalid time zones", () => {
    it("falls back to UTC instead of throwing on a bogus IANA id", () => {
      const instant = new Date("2026-01-15T10:40:00Z");

      expect(() => formatLocalTime("Not/AZone", instant)).not.toThrow();
      expect(formatLocalTime("Not/AZone", instant)).toBe(
        formatLocalTime("UTC", instant),
      );
      expect(formatLocalTime("Not/AZone", instant)).toBe("10:40");
    });

    it("falls back to UTC on an empty string", () => {
      expect(formatLocalTime("", new Date("2026-01-15T10:40:00Z"))).toBe("10:40");
    });

    it("falls back to UTC on a garbage value forced past the type check", () => {
      const bogus = 42 as unknown as string;
      expect(() => formatLocalTime(bogus, new Date("2026-01-15T10:40:00Z"))).not.toThrow();
    });
  });
});

describe("formatLocalTimeWithSeconds", () => {
  it("emits zero-padded HH:MM:SS in the target zone", () => {
    expect(
      formatLocalTimeWithSeconds("Asia/Manila", new Date("2026-01-15T10:40:07Z")),
    ).toBe("18:40:07");
  });

  it("is 24-hour and pads every field", () => {
    expect(
      formatLocalTimeWithSeconds("Asia/Manila", new Date("2026-01-14T20:03:09Z")),
    ).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(
      formatLocalTimeWithSeconds("Asia/Manila", new Date("2026-03-01T16:00:00Z")),
    ).toBe("00:00:00");
  });

  it("falls back to UTC on a bogus zone rather than throwing", () => {
    const instant = new Date("2026-01-15T10:40:07Z");
    expect(() => formatLocalTimeWithSeconds("Not/AZone", instant)).not.toThrow();
    expect(formatLocalTimeWithSeconds("Not/AZone", instant)).toBe("10:40:07");
  });
});

describe("useLocalClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:40:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the current local time on first render", () => {
    const { result } = renderHook(() => useLocalClock("Asia/Manila"));
    expect(result.current).toBe("18:40");
  });

  it("ticks once per second and reflects the next minute when it arrives", () => {
    const { result } = renderHook(() => useLocalClock("Asia/Manila"));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe("18:40");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe("18:41");
  });

  it("schedules exactly one interval, at a 1000ms period", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    renderHook(() => useLocalClock("Asia/Manila"));

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy.mock.calls[0]?.[1]).toBe(1000);
  });

  it("clears its interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useLocalClock("Asia/Manila"));

    expect(vi.getTimerCount()).toBe(1);
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops ticking after unmount — no timer callbacks fire", () => {
    const { result, unmount } = renderHook(() => useLocalClock("Asia/Manila"));
    const lastValue = result.current;

    unmount();
    act(() => {
      vi.advanceTimersByTime(600_000);
    });

    expect(vi.getTimerCount()).toBe(0);
    expect(result.current).toBe(lastValue);
  });

  it("shows seconds and re-formats them every second when asked", () => {
    const { result } = renderHook(() => useLocalClock("Asia/Manila", true));
    expect(result.current).toBe("18:40:00");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe("18:40:01");

    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(result.current).toBe("18:40:08");
  });

  it("re-subscribes when the time zone prop changes", () => {
    const { result, rerender } = renderHook(
      ({ tz }: { tz: string }) => useLocalClock(tz),
      { initialProps: { tz: "Asia/Manila" } },
    );

    expect(result.current).toBe("18:40");

    rerender({ tz: "UTC" });
    expect(result.current).toBe("10:40");
    expect(vi.getTimerCount()).toBe(1);
  });

  it("falls back to UTC for an invalid zone without throwing", () => {
    const { result } = renderHook(() => useLocalClock("Not/AZone"));
    expect(result.current).toBe("10:40");
  });
});
