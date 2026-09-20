import { describe, expect, it } from "vitest";
import { content } from "./index";
import { gmailComposeUrl } from "@/lib/contactUrl";
import { getSkillIcon } from "@/features/skills/skillIcons";

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

  it("every skill icon slug that is set resolves to a registered brand mark", () => {
    const unresolved = content.skills
      .filter((s) => s.icon !== undefined && getSkillIcon(s.icon) === null)
      .map((s) => `${s.id} → ${s.icon}`);
    expect(unresolved).toEqual([]);
  });

  it("ships the full 29-skill GitHub set", () => {
    expect(content.skills).toHaveLength(29);
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

  it("every social has a valid href (mailto, https, or the '#' placeholder)", () => {
    // '#' marks a link the owner has not supplied yet (x/instagram/upwork/tiktok).
    for (const social of content.socials) {
      expect(social.href).toMatch(/^(https:\/\/|mailto:|#$)/);
    }
  });

  it("ships all seven honeycomb links with contiguous hex indices", () => {
    const indices = content.socials.map((s) => s.hexIndex).sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("links Upwork (not YouTube) in the sixth hexagon, as a placeholder until the URL exists", () => {
    const upwork = content.socials.find((s) => s.id === "upwork");
    expect(upwork).toMatchObject({ label: "Upwork", icon: "upwork", hexIndex: 5, href: "#" });
    expect(content.socials.some((s) => s.id === "youtube" || s.icon === ("youtube" as never))).toBe(
      false,
    );
  });

  it("the Email hexagon opens Gmail compose for the profile address, not a mailto: link", () => {
    const email = content.socials.find((s) => s.id === "email");
    expect(email?.href).toBe(gmailComposeUrl(content.profile.email));
    expect(email?.href).not.toMatch(/^mailto:/);
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
