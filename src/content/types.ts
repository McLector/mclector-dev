/**
 * FROZEN after Phase 0. See docs/contracts.md.
 *
 * Every card in the bento grid consumes these types as props — never by
 * deep-importing `src/content/index.ts` directly. That indirection is what
 * lets tests inject fixtures (empty arrays, absurd string lengths, missing
 * images) without touching real data, and what lets a stream land without
 * ever needing to edit this file.
 *
 * Changing a field here is a request to the integrator, not a unilateral
 * edit by a stream — this is the single most contested file in the repo.
 */

/** A placeholder-first image reference. `src` is optional by design: a
 * missing asset is a deliberately designed render state, not a broken
 * `<img>`. See `src/content/assets.ts` for the swap point. */
export type ImageRef = {
  src?: string;
  alt: string;
  placeholder: {
    kind: "monogram" | "gradient" | "pattern";
    /** Seed for deterministic placeholder generation (e.g. initials, a hash). */
    seed: string;
    from: string;
    to: string;
  };
};

export type Profile = {
  handle: string; // "@McLector"
  displayName: string; // "Myre Lector"
  headline: [string, string]; // ["Hello!", "I'm Myre Lector"]
  bioLead: string; // bolded first phrase of the bio
  bioRest: string;
  avatar: ImageRef;
  badge: {
    title: string;
    subtitle: string;
    idLabel: string;
    caption: string;
  };
  location: {
    city: string;
    country: string;
    /** IANA time zone, e.g. "Asia/Manila". Validated in content.test.ts. */
    timeZone: string;
    utcLabel: string; // "GMT+8"
    mapTexture: ImageRef;
  };
  email: string;
  cv: {
    href?: string;
    label: string;
    /** false = button renders disabled/hidden per docs/contracts.md until a real PDF exists. */
    available: boolean;
  };
  /** What the owner is open to — rendered as chips under the bio. Empty = row omitted. */
  openTo: string[];
};

export type SkillGroup =
  | "language"
  | "mobile"
  | "web"
  | "data"
  | "hardware"
  | "tooling";

export type Skill = {
  id: string;
  label: string;
  group: SkillGroup;
  /** featured skills sort first within their group in the skills grid. */
  featured?: boolean;
  /** simple-icons slug for the brand logo (e.g. "typescript"). Omit for
   *  skills with no matching brand mark — the grid draws a lettered fallback. */
  icon?: string;
};

export type ProjectStatus = "live" | "in-progress" | "complete" | "planning";

export type ProjectLink = {
  label: string;
  href: string;
  kind: "live" | "repo" | "case-study";
};

export type Project = {
  /** URL-safe slug, used in the `#/project/:id` hash route. Stable forever. */
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  /** One paragraph per array entry, rendered in the detail overlay. */
  description: string[];
  role: string;
  status: ProjectStatus;
  year: string;
  stack: string[];
  thumbnail: ImageRef;
  cover?: ImageRef;
  links: ProjectLink[];
  /** true = appears in the "Latest projects" list; false = overlay-reachable only. */
  featured: boolean;
};

export type SocialIconName =
  | "github"
  | "linkedin"
  | "email"
  | "x"
  | "youtube"
  | "instagram"
  | "tiktok";

export type Social = {
  id: string;
  label: string;
  href: string;
  icon: SocialIconName;
  /** Position in the honeycomb grid; must be unique. */
  hexIndex: number;
};

export type CertificationStatus = "earned" | "in-progress" | "planned";

export type Certification = {
  id: string;
  title: string;
  issuer: string;
  issued?: string;
  credentialUrl?: string;
  status: CertificationStatus;
};

export type SiteContent = {
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  socials: Social[];
  certifications: Certification[];
};
