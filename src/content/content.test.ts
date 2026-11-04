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

  it("the CV is published: available, and its href is a root-relative PDF that exists in public/", () => {
    const { cv } = content.profile;
    expect(cv.available).toBe(true);
    expect(cv.href).toMatch(/^\/[\w.-]+\.pdf$/);
    // `src/` has no Node types, so ask Vite which files exist under public/. The PDF's bytes are
    // checked by e2e/centre-column.spec.ts against the built site.
    const publicPdfs = Object.keys(import.meta.glob("/public/*.pdf"));
    expect(publicPdfs).toContain(`/public${cv.href}`);
  });

  it("the badge subtitle matches the resume's full-stack positioning", () => {
    expect(content.profile.badge.subtitle).toBe("CS Student · Full-Stack Mobile Dev");
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

  it("lists Welcome to Lipa City as a non-featured Roblox project led by the owner", () => {
    const lipa = content.projects.find((p) => p.id === "welcome-to-lipa-city");
    expect(lipa).toBeDefined();
    expect(lipa?.title).toBe("Welcome to Lipa City");
    expect(lipa?.featured).toBe(false);
    expect(lipa?.status).toBe("complete");
    expect(lipa?.role).toMatch(/lead developer/i);
    expect(lipa?.stack).toEqual(expect.arrayContaining(["Luau", "Roblox Studio"]));
    // The game is unpublished, so the only honest link is the public source repo.
    expect(lipa?.links).toEqual([
      { label: "Repository", href: "https://github.com/McLector/Lipa-Highlights-Rblx", kind: "repo" },
    ]);
  });

  it("the four featured projects are unchanged by adding more", () => {
    expect(content.projects.filter((p) => p.featured).map((p) => p.id)).toEqual([
      "eiyu-system",
      "taskbuddy",
      "stark-rent",
      "esp32-study-monitor",
    ]);
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

  it("every social has a real https href, with no '#' placeholder left", () => {
    for (const social of content.socials) {
      expect(social.href, social.id).toMatch(/^https:\/\//);
    }
  });

  it("links the owner's real X, Instagram, TikTok and Upwork profiles", () => {
    const hrefOf = (id: string) => content.socials.find((s) => s.id === id)?.href;
    expect(hrefOf("x")).toBe("https://x.com/mclectorr");
    expect(hrefOf("instagram")).toBe("https://www.instagram.com/maljamore/");
    expect(hrefOf("tiktok")).toBe("https://www.tiktok.com/@mclectorr");
    expect(hrefOf("upwork")).toBe("https://www.upwork.com/freelancers/~01894ee04fe2d6293e");
  });

  it("no social link carries a share-tracking query string", () => {
    for (const social of content.socials) {
      expect(social.href, social.id).not.toMatch(/mp_source|utm_|[?&]igsh/);
    }
  });

  it("ships all seven honeycomb links with contiguous hex indices", () => {
    const indices = content.socials.map((s) => s.hexIndex).sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("links Upwork (not YouTube) in the sixth hexagon", () => {
    const upwork = content.socials.find((s) => s.id === "upwork");
    expect(upwork).toMatchObject({ label: "Upwork", icon: "upwork", hexIndex: 5 });
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
