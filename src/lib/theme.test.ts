import { describe, expect, it } from "vitest";
import { nextTheme, resolveInitialTheme, THEMES, type Theme } from "./theme";

describe("resolveInitialTheme", () => {
  it("honours a valid stored value over the system preference", () => {
    expect(resolveInitialTheme("light", true)).toBe("light");
    expect(resolveInitialTheme("dark", false)).toBe("dark");
  });

  it("falls back to the system preference when there is no stored value", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });

  it("ignores a garbage stored value and uses the system preference", () => {
    expect(resolveInitialTheme("banana", true)).toBe("dark");
    expect(resolveInitialTheme("", false)).toBe("light");
    expect(resolveInitialTheme(undefined, true)).toBe("dark");
  });

  it("defaults to dark when nothing is known", () => {
    // No stored value and no system signal → the deep-space default.
    expect(resolveInitialTheme(null, false)).toBe("light");
    expect(resolveInitialTheme(null, true)).toBe("dark");
  });
});

describe("nextTheme", () => {
  it("toggles between the two themes", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });

  it("round-trips", () => {
    const start: Theme = "dark";
    expect(nextTheme(nextTheme(start))).toBe(start);
  });
});

describe("THEMES", () => {
  it("is exactly the two supported themes", () => {
    expect(THEMES).toEqual(["dark", "light"]);
  });
});
