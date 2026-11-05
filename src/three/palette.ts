import * as THREE from "three";
import { DEFAULT_THEME, isTheme, type Theme } from "@/lib/theme";

/**
 * The scene's two looks, as pure data.
 *
 * DARK is the neon the site shipped with: bright cyan added onto a deep bay (additive blending).
 * LIGHT is ink: darker blues drawn normally onto the pale frosted-glass bay, because added light has nothing to
 * add to on a pale ground and washes out. Only these four colours and the blend mode change between themes.
 * Everything else (the inner arcs, ticks, hairlines, dome, dash ring, glows) keeps its pale colour in both,
 * which is the look the owner approved (round 1 option 1, light-theme mock-up).
 */
export type HoloPalette = {
  readonly blending: "additive" | "normal";
  /** The card's bracket lines and the picture shader's edge tint. */
  readonly arc: number;
  /** The projector's outer ring and its thick arcs. */
  readonly hud: number;
  /** Most of the shafts of light. */
  readonly shaftTeal: number;
  /** The rest of the shafts. */
  readonly shaftBlue: number;
};

export const HOLO_PALETTES: Readonly<Record<Theme, HoloPalette>> = Object.freeze({
  dark: Object.freeze({
    blending: "additive",
    arc: 0x5ec8ff,
    hud: 0x38b6ff,
    shaftTeal: 0x2fd9c8,
    shaftBlue: 0x3db8ff,
  }),
  light: Object.freeze({
    blending: "normal",
    arc: 0x1a86f5,
    hud: 0x1560c8,
    shaftTeal: 0x0f7fb0,
    shaftBlue: 0x1a6fe0,
  }),
});

/** The palette for a theme. Anything that is not a theme gets dark, the site's default. */
export function holoPalette(theme: Theme): HoloPalette {
  return HOLO_PALETTES[isTheme(theme) ? theme : DEFAULT_THEME];
}

/** THREE's blend mode for a palette. */
export function blendingFor(palette: HoloPalette): THREE.Blending {
  return palette.blending === "additive" ? THREE.AdditiveBlending : THREE.NormalBlending;
}
