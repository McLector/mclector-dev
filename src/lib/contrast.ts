/**
 * WCAG 2.x contrast-ratio checker, plus the frozen budget of
 * foreground/background pairs actually used on cards. Design tokens in
 * src/styles/index.css are authored in oklch (for nicer gradient
 * interpolation); the hex values below are their approximate sRGB
 * rendering against the worst-case card background — the gradient
 * bleeding through backdrop-blur at the darkest card opacity — and must
 * be kept in sync by hand if a token changes. See docs/contracts.md.
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

// DARK theme worst case: the translucent glass card sitting over the brightest
// nebula stop the galaxy paints behind it. Hex values are the sRGB rendering of
// the oklch tokens in src/styles/index.css and are kept in sync by hand.
const CARD_BG_WORST_CASE = "#3e2335"; // dark glass over a bright magenta nebula stop
const CHIP_BG_WORST_CASE = "#4d3545"; // white/8 over CARD_BG_WORST_CASE

// LIGHT theme (steel) worst case: white/88 glass over the steel window panel
// (oklch(.42 .10 250 / .338)) over the DARKEST sky stop (--sky-top, oklch(.69 .098 250), the top of the
// gradient) — the dimmest ground dark text must still read against. Composited in sRGB, the way a
// browser blends translucent layers.
const LIGHT_CARD_BG_WORST_CASE = "#eaf0f7";
// ink/8% over LIGHT_CARD_BG_WORST_CASE — the themed chip surface.
const LIGHT_CHIP_BG_WORST_CASE = "#d8dfe6";

// The "Open to" accent band (IntroCard, the approved polished "refined band"). Composited in sRGB, the way a
// browser blends translucent layers. The band is a vertical gradient from arc 17% (top) to arc 11% (bottom); the
// STRONGEST tint is the worst case for text on it (light text on the lightest dark-theme fill, dark text on the
// darkest light-theme fill), so the pairs below use 17%. The chip is arc 15% over that band, with no ring.
// dark  arc #5ec8ff over #3e2335 → band #433f57 → chip #475470
// light arc #1a86f5 over #eaf0f7 → band #c7def6 → chip #add1f6
const DARK_OPEN_BAND = "#433f57";
const DARK_OPEN_CHIP = "#475470";
const LIGHT_OPEN_BAND = "#c7def6";
const LIGHT_OPEN_CHIP = "#add1f6";

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
  // --- Light theme (steel) ---
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
    background: "#c9e3e0",
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
