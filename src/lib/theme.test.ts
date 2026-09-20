import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, nextTheme, resolveInitialTheme, THEMES, type Theme } from "./theme";

describe("DEFAULT_THEME", () => {
  it("is dark — the deep-space night sky is what a first-time visitor sees", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });
});

describe("resolveInitialTheme", () => {
  it("honours a valid stored choice, so the day/night toggle keeps working across visits", () => {
    expect(resolveInitialTheme("light")).toBe("light");
    expect(resolveInitialTheme("dark")).toBe("dark");
  });

  it("is dark when nothing is stored", () => {
    expect(resolveInitialTheme(null)).toBe("dark");
    expect(resolveInitialTheme(undefined)).toBe("dark");
  });

  it("ignores a garbage stored value and stays dark", () => {
    expect(resolveInitialTheme("banana")).toBe("dark");
    expect(resolveInitialTheme("")).toBe("dark");
    // Case matters: only the two exact names are valid choices.
    expect(resolveInitialTheme("LIGHT")).toBe("dark");
    expect(resolveInitialTheme(" light")).toBe("dark");
  });

  it("takes no OS colour-scheme signal: a light-mode OS must not turn a first visit light", () => {
    // The rule is `stored ?? dark`; the visitor's OS setting is deliberately not an input.
    expect(resolveInitialTheme.length).toBe(1);
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
