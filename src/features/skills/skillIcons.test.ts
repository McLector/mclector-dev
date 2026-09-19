import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { getSkillIcon } from "./skillIcons";

/** Marks that were not in simple-icons@16 and had to be sourced or drawn. */
const ADDED = [
  "reactnavigation",
  "zustand",
  "postgis",
  "azuredevops",
  "blynk",
  "openai",
  "antigravity",
  "opencode",
  "cline",
  "groq",
  "windows",
];

/** Hand-drawn stand-ins — NOT the brands' real marks (no permissive source exists). */
const APPROXIMATED = ["blynk", "groq", "postgis", "zustand"];

describe("getSkillIcon", () => {
  it("returns null for a missing or unknown slug", () => {
    expect(getSkillIcon(undefined)).toBeNull();
    expect(getSkillIcon("")).toBeNull();
    expect(getSkillIcon("not-a-real-brand")).toBeNull();
  });

  it.each(ADDED)("resolves the newly added mark %s", (slug) => {
    expect(getSkillIcon(slug)).not.toBeNull();
  });

  it("gives every mark drawable geometry, a colour and a viewBox", () => {
    for (const slug of ADDED) {
      const icon = getSkillIcon(slug)!;
      expect(icon.path.length, `${slug} path`).toBeGreaterThan(10);
      expect(icon.path, `${slug} path starts with a move`).toMatch(/^[Mm]/);
      expect(icon.hex, `${slug} hex`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(icon.viewBox, `${slug} viewBox`).toMatch(/^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/);
    }
  });

  it("keeps the 24-unit box for the mainstream simple-icons marks", () => {
    expect(getSkillIcon("typescript")!.viewBox).toBe("0 0 24 24");
    expect(getSkillIcon("react")!.viewBox).toBe("0 0 24 24");
  });

  it("uses the marks' own coordinate systems where they are not 24 units", () => {
    expect(getSkillIcon("reactnavigation")!.viewBox).toBe("0 0 128 128");
    expect(getSkillIcon("antigravity")!.viewBox).toBe("0 1 24 23");
  });

  it("flags exactly the four hand-drawn approximations, and nothing else", () => {
    const flagged = ADDED.concat(["typescript", "react", "git", "figma"])
      .filter((slug) => getSkillIcon(slug)?.approximate)
      .sort();
    expect(flagged).toEqual(APPROXIMATED);
  });

  it("draws the stroke-style approximations with strokes, not fills", () => {
    for (const slug of ["groq", "blynk", "postgis"]) {
      expect(getSkillIcon(slug)!.stroke, slug).toBe(true);
    }
    expect(getSkillIcon("typescript")!.stroke).toBe(false);
  });
});

describe("real content", () => {
  it("has a mark for every one of the 29 skills — no lettered fallback tiles remain", () => {
    const missing = content.skills
      .filter((s) => getSkillIcon(s.icon) === null)
      .map((s) => s.label);
    expect(missing).toEqual([]);
    expect(content.skills).toHaveLength(29);
  });

  it("assigns each new brand to its skill", () => {
    const byId = Object.fromEntries(content.skills.map((s) => [s.id, s.icon]));
    expect(byId).toMatchObject({
      "react-navigation": "reactnavigation",
      zustand: "zustand",
      postgis: "postgis",
      "azure-devops": "azuredevops",
      blynk: "blynk",
      codex: "openai",
      antigravity: "antigravity",
      opencode: "opencode",
      cline: "cline",
      groq: "groq",
      "sapi-tts": "windows",
    });
  });
});
