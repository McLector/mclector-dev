import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { HOLO_PALETTES, blendingFor, holoPalette, type HoloPalette } from "./palette";
import type { Theme } from "@/lib/theme";

/**
 * The scene's two looks. Dark is the neon the site shipped with: bright cyan added onto a deep bay. Light is
 * ink: darker blues drawn normally onto a pale glass bay, where additive light would wash out to nothing.
 * Pure data, so it runs without WebGL.
 */
const luminance = (hex: number): number => {
  const channel = (shift: number) => {
    const c = ((hex >> shift) & 0xff) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
};
const COLOURS = ["arc", "hud", "shaftTeal", "shaftBlue"] as const;

describe("holoPalette", () => {
  it("dark is exactly today's neon, so the dark theme is unchanged", () => {
    expect(holoPalette("dark")).toEqual({
      blending: "additive",
      arc: 0x5ec8ff,
      hud: 0x38b6ff,
      shaftTeal: 0x2fd9c8,
      shaftBlue: 0x3db8ff,
    });
  });

  it("light is ink: normal blending and the approved blues", () => {
    expect(holoPalette("light")).toEqual({
      blending: "normal",
      arc: 0x1a86f5,
      hud: 0x1560c8,
      shaftTeal: 0x0f7fb0,
      shaftBlue: 0x1a6fe0,
    });
  });

  it.each(COLOURS)("light's %s is darker than dark's, because ink must read against a pale bay", (key) => {
    expect(luminance(holoPalette("light")[key])).toBeLessThan(luminance(holoPalette("dark")[key]));
  });

  it("only the dark palette adds light: additive blending vanishes on a pale bay", () => {
    expect(holoPalette("dark").blending).toBe("additive");
    expect(holoPalette("light").blending).toBe("normal");
  });

  it.each(["dark", "light"] as Theme[])("%s has four valid 24-bit colours", (theme) => {
    for (const key of COLOURS) {
      const value = holoPalette(theme)[key];
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffff);
    }
  });

  it("keeps the teal and blue shafts distinguishable in both themes", () => {
    for (const theme of ["dark", "light"] as Theme[]) {
      const p = holoPalette(theme);
      expect(p.shaftTeal).not.toBe(p.shaftBlue);
    }
  });

  it("falls back to dark for a value that is not a theme, rather than throwing", () => {
    expect(holoPalette("banana" as unknown as Theme)).toEqual(HOLO_PALETTES.dark);
    expect(holoPalette(undefined as unknown as Theme)).toEqual(HOLO_PALETTES.dark);
  });

  it("returns a palette that cannot be edited in place, so one scene cannot recolour the other", () => {
    const light = holoPalette("light") as HoloPalette;
    expect(() => {
      (light as { arc: number }).arc = 0;
    }).toThrow();
    expect(holoPalette("light").arc).toBe(0x1a86f5);
  });
});

describe("blendingFor", () => {
  it("maps additive and normal onto THREE's blend modes", () => {
    expect(blendingFor(holoPalette("dark"))).toBe(THREE.AdditiveBlending);
    expect(blendingFor(holoPalette("light"))).toBe(THREE.NormalBlending);
  });
});
