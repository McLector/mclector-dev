import { describe, expect, it } from "vitest";
import {
  DEFAULT_PASS_THEME_ID,
  PASS_THEMES,
  resolvePassTheme,
} from "./passThemes";

describe("PASS_THEMES", () => {
  it("has a stable, non-empty set with unique ids", () => {
    expect(PASS_THEMES.length).toBeGreaterThanOrEqual(3);
    const ids = PASS_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every theme carries a from/to accent pair and a label", () => {
    for (const theme of PASS_THEMES) {
      expect(theme.from).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.to).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.label.length).toBeGreaterThan(0);
    }
  });

  it("includes the default id", () => {
    expect(PASS_THEMES.some((t) => t.id === DEFAULT_PASS_THEME_ID)).toBe(true);
  });
});

describe("resolvePassTheme", () => {
  it("returns the matching theme by id", () => {
    const first = PASS_THEMES[1];
    expect(resolvePassTheme(first.id)).toEqual(first);
  });

  it("falls back to the default for an unknown id", () => {
    const fallback = resolvePassTheme("nope");
    expect(fallback.id).toBe(DEFAULT_PASS_THEME_ID);
  });

  it("falls back to the default for undefined", () => {
    expect(resolvePassTheme(undefined).id).toBe(DEFAULT_PASS_THEME_ID);
  });
});
