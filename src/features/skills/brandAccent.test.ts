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

  it("judges the light theme against the STEEL tile ground (#e2effe, measured from the rendered tile)", () => {
    // These two sit right at the 3:1 line, so they are what flips if the ground drifts. On the old lilac ground
    // (#e4e8f6) both fell back to the arc; on steel they clear it and keep their own colour on hover.
    expect(brandAccents("F24E1E").light).toBe("#F24E1E"); // Figma orange, 3.06:1
    expect(brandAccents("3186ff").light).toBe("#3186ff"); // 3.01:1
    // ...and a colour that is still under the line keeps falling back.
    expect(brandAccents("d4a017").light).toBe(ARC);
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
