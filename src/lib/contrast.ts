/**
 * WCAG 2.x contrast-ratio checker, plus the frozen budget of
 * foreground/background pairs actually used on cards. Design tokens in
 * src/styles/index.css are authored in oklch (for nicer gradient
 * interpolation); the hex values below are their approximate sRGB
 * rendering against the worst-case ground — the backdrop seen through the
 * window's 22px blur, under the window panel and the card — and must be
 * kept in sync by hand if a token changes. See docs/contracts.md.
 */

export type TokenContrastPair = {
  name: string;
  foreground: string;
  background: string;
  minimumRatio: number;
};

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

function linearizeChannel(c8bit: number): number {
  const c = c8bit / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const [lr, lg, lb] = [linearizeChannel(r), linearizeChannel(g), linearizeChannel(b)];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio between two colors, order-independent, range [1, 21]. */
export function contrastRatio(colorA: string, colorB: string): number {
  const lA = relativeLuminance(colorA);
  const lB = relativeLuminance(colorB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// How the grounds were measured: the page rendered with the window hidden, at 1440x900 and at 390x844, and
// the worst pixel under the window taken from the browser's own 22px-blurred backdrop (the window's
// backdrop-filter), not from raw pixels, so a single 1px star cannot set it. Layers are then composited in
// sRGB, the way a browser blends translucent layers: the window --panel first, then the card, then the chip
// or band. Each hex was checked against a rendered probe (within 2 levels per channel).

// DARK theme worst case: the brightest blurred backdrop under the window is the arc-blue horizon glow along
// the bottom edge (#1a3749, at 390x844; 1440x900 gives the slightly darker #152d3c, so mobile governs).
// --panel oklch(.16 .02 275 / .42) over it → #142534; the glass card oklch(.17 .014 278 / .5) over that:
const CARD_BG_WORST_CASE = "#111a25";
const CHIP_BG_WORST_CASE = "#232c36"; // ink (oklch(.97 .005 280)) 8% over CARD_BG_WORST_CASE

// LIGHT theme worst case: the card is opaque white (--glass-bg: #fff), so the ground behind the window (white,
// with an arc-blue wash along the bottom) never reaches the text; the card itself is the worst case.
const LIGHT_CARD_BG_WORST_CASE = "#ffffff";
// ink (oklch(.21 .04 262)) 8% over LIGHT_CARD_BG_WORST_CASE — the themed chip surface.
const LIGHT_CHIP_BG_WORST_CASE = "#ecedee";

// The "Open to" accent band (IntroCard, the approved polished "refined band"). Composited in sRGB, the way a
// browser blends translucent layers. The band is a vertical gradient from arc 17% (top) to arc 11% (bottom); the
// STRONGEST tint is the worst case for text on it (light text on the lightest dark-theme fill, dark text on the
// darkest light-theme fill), so the pairs below use 17%. The chip is arc 15% over that band, with no ring.
// dark  arc #5ec8ff over #111a25 → band #1e384a → chip #284e65
// light arc #1a86f5 over #ffffff → band #d8eafd → chip #bcdbfc
const DARK_OPEN_BAND = "#1e384a";
const DARK_OPEN_CHIP = "#284e65";
const LIGHT_OPEN_BAND = "#d8eafd";
const LIGHT_OPEN_CHIP = "#bcdbfc";

// The light hologram bay: the darkest stop of --stage-bg, oklch(0.93 0.025 250) at the bottom of its linear
// gradient. It computes to #dceaf8; the darkest rendered sample along the bottom, where the caption sits, is
// #dce9f8, which is used.
const LIGHT_BAY_BG = "#dce9f8";
// The "Currently Active" pill: green #0f9a63 at 15% over LIGHT_CARD_BG_WORST_CASE.
const LIGHT_ACTIVE_PILL = "#dbf0e8";

export const TOKEN_CONTRAST_PAIRS: TokenContrastPair[] = [
  // --- Dark theme (default) ---
  {
    name: "dark: text-primary on card (body text)",
    foreground: "#f4f5f8",
    background: CARD_BG_WORST_CASE,
    minimumRatio: 7,
  },
  {
    name: "dark: text-secondary on card",
    foreground: "#c2c4cc",
    background: CARD_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  {
    name: "dark: text-muted on card",
    foreground: "#9a9eab",
    background: CARD_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  {
    name: "dark: chip text on white/8 chip background",
    foreground: "#b8bcc6",
    background: CHIP_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  // color-mix(in oklab, text-primary 62%, arc 38%) — the .eyebrow and skill
  // group-heading colour. Hex is the oklab mix of #f4f5f8 and #5ec8ff.
  {
    name: "dark: eyebrow (ink/arc mix) on card",
    foreground: "#c0e5fc",
    background: CARD_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  // "Open to" accent band — chip text is text-primary; the label is the oklab mix
  // color-mix(in oklab, text-primary 45%, arc 55%) of #f4f5f8 and #5ec8ff.
  {
    name: "dark: Open to chip text (ink) on the arc/15 chip",
    foreground: "#f4f5f8",
    background: DARK_OPEN_CHIP,
    minimumRatio: 4.5,
  },
  {
    name: "dark: Open to label (ink/arc mix) on the arc/17 band",
    foreground: "#a8ddfd",
    background: DARK_OPEN_BAND,
    minimumRatio: 4.5,
  },
  // --- Light theme (white) ---
  // The hologram bay in the light theme: the darkest stop of its pale gradient (LIGHT_BAY_BG).
  {
    name: "light: stage caption on the hologram bay",
    foreground: "#1b2942",
    background: LIGHT_BAY_BG,
    minimumRatio: 4.5,
  },
  {
    name: "light: hologram badge title on the hologram bay",
    foreground: "#0e182b",
    background: LIGHT_BAY_BG,
    minimumRatio: 4.5,
  },
  {
    name: "light: hologram badge subtitle on the hologram bay",
    foreground: "#2d384d",
    background: LIGHT_BAY_BG,
    minimumRatio: 4.5,
  },
  {
    name: "light: text-primary on card",
    foreground: "#0e182b",
    background: LIGHT_CARD_BG_WORST_CASE,
    minimumRatio: 7,
  },
  {
    name: "light: text-secondary on card",
    foreground: "#2d384d",
    background: LIGHT_CARD_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  {
    name: "light: text-muted on card",
    foreground: "#445066",
    background: LIGHT_CARD_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  // Oklab mix of ink #0e182b (62%) and the light arc #1a86f5 (38%).
  {
    name: "light: eyebrow (ink/arc mix) on card",
    foreground: "#183f71",
    background: LIGHT_CARD_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  {
    name: "light: Currently Active (green-ink) on its green/15 pill",
    foreground: "#0b6b46",
    background: LIGHT_ACTIVE_PILL,
    minimumRatio: 4.5,
  },
  {
    name: "light: chip text (text-secondary) on ink/8 chip",
    foreground: "#2d384d",
    background: LIGHT_CHIP_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  // "Open to" accent band — the label is the oklab mix of ink #0e182b (45%) and arc #1a86f5 (55%).
  {
    name: "light: Open to chip text (ink) on the arc/15 chip",
    foreground: "#0e182b",
    background: LIGHT_OPEN_CHIP,
    minimumRatio: 4.5,
  },
  {
    name: "light: Open to label (ink/arc mix) on the arc/17 band",
    foreground: "#1b5193",
    background: LIGHT_OPEN_BAND,
    minimumRatio: 4.5,
  },
];
