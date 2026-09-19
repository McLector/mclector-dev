import { describe, expect, it } from "vitest";
import overlaySrc from "./Overlay/ProjectOverlay.tsx?raw";
import pillSrc from "./ui/Pill.tsx?raw";
import chipSrc from "./ui/Chip.tsx?raw";

/**
 * The project overlay and its small parts render through a
 * portal, outside the themed card surfaces, so they were authored dark-only
 * (`white/8`, `neutral-950/95`, …) and looked jarring in the twilight theme.
 * Surfaces must come from tokens so both themes stay correct.
 */
const LITERALS: [RegExp, string][] = [
  [/\b(?:bg|ring|border|text|hover:bg)-white\/\d+/, "white/<alpha>"],
  [/\bbg-black\/\d+/, "black/<alpha> scrim (use var(--scrim))"],
  [/\bbg-neutral-\d+/, "neutral-<n> surface"],
];

const files: Record<string, string> = {
  "ProjectOverlay.tsx": overlaySrc,
  "Pill.tsx": pillSrc,
  "Chip.tsx": chipSrc,
};

describe("themed surfaces carry no dark-only colour literals", () => {
  for (const [name, source] of Object.entries(files)) {
    it(`${name} uses tokens, not hard-coded white/black/neutral`, () => {
      const hits = LITERALS.filter(([re]) => re.test(source)).map(([, why]) => why);
      expect(hits).toEqual([]);
    });
  }

  it("Pill status tones override their text colour for the light theme", () => {
    expect(pillSrc).toMatch(/light:text-emerald-\d+/);
    expect(pillSrc).toMatch(/light:text-amber-\d+/);
  });
});
