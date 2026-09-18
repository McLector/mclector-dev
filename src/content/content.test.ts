import { describe, expect, it } from "vitest";
import { content } from "./index";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

describe("content invariants", () => {
  it("has a non-empty profile identity", () => {
    expect(content.profile.displayName.trim().length).toBeGreaterThan(0);
    expect(content.profile.handle.startsWith("@")).toBe(true);
    expect(content.profile.headline).toHaveLength(2);
  });

  it("profile email is a valid address", () => {
    expect(content.profile.email).toMatch(EMAIL_RE);
  });

  it("profile location uses a valid IANA time zone", () => {
    expect(isValidIanaTimeZone(content.profile.location.timeZone)).toBe(true);
  });

  it("CV button never links out when unavailable", () => {
    if (!content.profile.cv.available) {
      expect(content.profile.cv.href).toBeUndefined();
    } else {
      expect(content.profile.cv.href).toBeTruthy();
    }
  });

  it("has at least one skill and every skill has a stable id", () => {
    expect(content.skills.length).toBeGreaterThan(0);
    const ids = content.skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("project ids are unique and URL-safe slugs", () => {
    const ids = content.projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(SLUG_RE);
    }
  });

  it("every featured project has a thumbnail with alt text", () => {
    const featured = content.projects.filter((p) => p.featured);
    expect(featured.length).toBeGreaterThan(0);
    for (const project of featured) {
      expect(project.thumbnail.alt.trim().length).toBeGreaterThan(0);
    }
  });

  it("every project has at least one link", () => {
    for (const project of content.projects) {
      expect(project.links.length).toBeGreaterThan(0);
    }
  });

  it("social hexIndex values are unique", () => {
    const indices = content.socials.map((s) => s.hexIndex);
    expect(new Set(indices).size).toBe(indices.length);
  });

  it("every social has a valid href (mailto or https)", () => {
    for (const social of content.socials) {
      expect(social.href).toMatch(/^(https:\/\/|mailto:)/);
    }
  });

  it("certifications ship empty in v1 but are well-typed", () => {
    expect(Array.isArray(content.certifications)).toBe(true);
    expect(content.certifications).toHaveLength(0);
  });

  it("certification ids, when present, are unique", () => {
    const ids = content.certifications.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
