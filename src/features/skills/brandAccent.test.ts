import { describe, expect, it } from "vitest";
import { brandAccents } from "./brandAccent";

const ARC = "var(--arc)";

describe("brandAccents", () => {
  it("keeps a mid-tone brand colour in both themes", () => {
    // Expo-ish blue: readable on the dark and the light tile ground.
    expect(brandAccents("3178C6")).toEqual({ dark: "#3178C6", light: "#3178C6" });
  });

  it("clamps a near-black brand to the arc on the dark theme only", () => {
    const result = brandAccents("000000");
    expect(result.dark).toBe(ARC);
    expect(result.light).toBe("#000000");
  });

  it("clamps a near-white brand to the arc on the light theme only", () => {
    const result = brandAccents("FFFFFF");
    expect(result.light).toBe(ARC);
    expect(result.dark).toBe("#FFFFFF");
  });

  it("clamps Anthropic's #191919 on dark (the reason this exists)", () => {
    expect(brandAccents("191919").dark).toBe(ARC);
  });

  it("judges the light theme against the WHITE theme's tile ground (#f1f6fa, the opaque --tile-bg)", () => {
    // The white theme's tile is opaque oklch(0.97 0.008 250) = #f1f6fa (computed, and read back from the rendered
    // tile). PostGIS and Groq sit right at the 3:1 line: on the old steel ground (#e2effe) both fell back to the
    // arc; on the paler white-theme tile they clear it and keep their own colour on hover.
    expect(brandAccents("5b8fd9").light).toBe("#5b8fd9"); // PostGIS, 3.03:1 (2.82:1 on steel)
    expect(brandAccents("f55036").light).toBe("#f55036"); // Groq, 3.17:1 (2.96:1 on steel)
    // The steel theme's boundary cases still clear the line.
    expect(brandAccents("F24E1E").light).toBe("#F24E1E"); // Figma orange, 3.28:1
    expect(brandAccents("3186ff").light).toBe("#3186ff"); // 3.23:1
    // ...and a colour that is still under the line keeps falling back.
    expect(brandAccents("d4a017").light).toBe(ARC);
    expect(brandAccents("c7833b").light).toBe(ARC); // Zustand, 2.86:1
  });

  it("returns the arc for both themes when there is no brand hex", () => {
    expect(brandAccents(undefined)).toEqual({ dark: ARC, light: ARC });
  });

  it("is defensive about a malformed hex", () => {
    expect(brandAccents("nope")).toEqual({ dark: ARC, light: ARC });
    expect(brandAccents("")).toEqual({ dark: ARC, light: ARC });
  });

  it("tolerates a leading # and lower case", () => {
    expect(brandAccents("#3178c6").dark).toBe("#3178c6");
  });
});
