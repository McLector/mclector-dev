import { contrastRatio } from "@/lib/contrast";

/**
 * Hover tint/glow colour for a skill tile, per theme.
 *
 * Several brand marks are near-black (Render, X, TikTok, Anthropic ≈ #000–#191919),
 * so their brand colour is invisible as a glow on the dark tile ground. Rather
 * than lose the real logo, we keep its path and swap only the *accent* to the
 * arc-reactor cyan when the brand hex can't be seen against that theme's tile.
 *
 * 3:1 is the WCAG 1.4.11 threshold for non-text graphics.
 */
const ARC = "var(--arc)";
const MIN_CONTRAST = 3;

// sRGB of the skill tile ground per theme. Light is MEASURED from the rendered steel tile (the median of 12 tiles, all
// identical: #e2effe); dark is the original estimate. Re-measure if the light tokens (--tile-bg, --glass-bg, the
// steel sky/panel) change: a few brand colours sit right at the 3:1 line and flip with it.
const TILE_GROUND = { dark: "#1b2036", light: "#e2effe" } as const;

export type BrandAccents = { dark: string; light: string };

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

function pick(hex: string, ground: string): string {
  return contrastRatio(hex, ground) >= MIN_CONTRAST ? hex : ARC;
}

export function brandAccents(brandHex: string | undefined): BrandAccents {
  const match = brandHex ? HEX_RE.exec(brandHex) : null;
  if (!match) return { dark: ARC, light: ARC };
  const hex = `#${match[1]}`;
  // Preserve the caller's casing: a bare "3178C6" and "#3178c6" both round-trip.
  const original = brandHex!.startsWith("#") ? brandHex! : hex;
  return {
    dark: pick(hex, TILE_GROUND.dark) === ARC ? ARC : original,
    light: pick(hex, TILE_GROUND.light) === ARC ? ARC : original,
  };
}
