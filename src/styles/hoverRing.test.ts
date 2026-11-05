import { describe, expect, it } from "vitest";

/**
 * Source guards for the light-theme cohesion pass: the row hover rings use --hover-ring (--glass-highlight is
 * transparent in light, so the ring vanished), and the project overlay's light shadow is the window's ink tone,
 * not a blue tint.
 */
const src = import.meta.glob<string>(
  [
    "/src/features/projects/ProjectsCard.tsx",
    "/src/features/certifications/CertificationsCard.tsx",
    "/src/components/Overlay/ProjectOverlay.tsx",
  ],
  { query: "?raw", import: "default", eager: true },
);
const get = (name: string) => Object.entries(src).find(([p]) => p.endsWith(name))?.[1] ?? "";

describe("light-theme hover ring and overlay shadow", () => {
  for (const file of ["ProjectsCard.tsx", "CertificationsCard.tsx"]) {
    it(`${file} hovers with --hover-ring, not --glass-highlight`, () => {
      const text = get(file);
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain("ring-[var(--hover-ring)]");
      expect(text).not.toContain("--glass-highlight");
    });
  }

  it("the project overlay uses the ink-toned light shadow", () => {
    const text = get("ProjectOverlay.tsx");
    expect(text).toContain("light:shadow-[0_40px_120px_-30px_oklch(0.3_0.06_250/0.3)]");
    expect(text).not.toContain("rgb(24_44_86");
  });
});
