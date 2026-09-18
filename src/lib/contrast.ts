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

const CARD_BG_WORST_CASE = "#3e2335"; // surface-raised @ 85% over the magenta gradient stop
const CHIP_BG_WORST_CASE = "#4d3545"; // white/8 over CARD_BG_WORST_CASE

export const TOKEN_CONTRAST_PAIRS: TokenContrastPair[] = [
  {
    name: "text-primary on card (body text)",
    foreground: "#f5f4f7",
    background: CARD_BG_WORST_CASE,
    minimumRatio: 7,
  },
  {
    name: "text-secondary on card",
    foreground: "#c9c7d1",
    background: CARD_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  {
    name: "text-muted on card",
    foreground: "#96939f",
    background: CARD_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
  {
    name: "chip text on white/8 chip background",
    foreground: "#b8bcc6",
    background: CHIP_BG_WORST_CASE,
    minimumRatio: 4.5,
  },
];
