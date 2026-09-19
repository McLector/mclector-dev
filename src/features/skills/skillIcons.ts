/**
 * The brand marks the skills grid draws. Resolution order:
 *   1. `simple-icons` — imported by name (never `import * as`) so the bundler
 *      tree-shakes the rest away; importing the whole set would blow the
 *      initial-bundle budget.
 *   2. `customIcons.ts` — marks simple-icons@16 does not ship (real logos from
 *      permissive sources, plus four flagged hand-drawn stand-ins).
 * A skill whose `icon` slug matches neither draws a lettered fallback.
 */
import {
  siArduino,
  siClaude,
  siCline,
  siCplusplus,
  siEspressif,
  siExpo,
  siFigma,
  siGit,
  siJavascript,
  siNextdotjs,
  siOpencode,
  siPostgresql,
  siPython,
  siReact,
  siRender,
  siShadcnui,
  siSupabase,
  siTailwindcss,
  siTypescript,
  siVercel,
} from "simple-icons";
import { CUSTOM_ICONS, type CustomIcon } from "./customIcons";

/** What a tile needs to draw a mark, whichever registry it came from. */
export type SkillIconData = {
  path: string;
  /** `#rrggbb` — drives the hover tint via brandAccents(). */
  hex: string;
  title: string;
  viewBox: string;
  /** Drawn with strokes (fill none) rather than filled. */
  stroke: boolean;
  fillRule?: "evenodd";
  /** A hand-drawn stand-in, not the brand's actual mark. */
  approximate: boolean;
};

type SimpleIconLike = { path: string; hex: string; title: string };

const SIMPLE: Record<string, SimpleIconLike> = {
  typescript: siTypescript,
  javascript: siJavascript,
  python: siPython,
  cplusplus: siCplusplus,
  react: siReact,
  expo: siExpo,
  nextdotjs: siNextdotjs,
  tailwindcss: siTailwindcss,
  shadcnui: siShadcnui,
  supabase: siSupabase,
  postgresql: siPostgresql,
  espressif: siEspressif,
  arduino: siArduino,
  figma: siFigma,
  git: siGit,
  vercel: siVercel,
  render: siRender,
  claude: siClaude,
  opencode: siOpencode,
  cline: siCline,
};

const fromSimple = (i: SimpleIconLike): SkillIconData => ({
  path: i.path,
  hex: `#${i.hex}`,
  title: i.title,
  viewBox: "0 0 24 24",
  stroke: false,
  approximate: false,
});

const fromCustom = (c: CustomIcon): SkillIconData => ({
  path: c.path,
  hex: c.hex,
  title: c.title,
  viewBox: c.viewBox,
  stroke: c.stroke ?? false,
  fillRule: c.fillRule,
  approximate: c.approximate ?? false,
});

// A Map, not an object: a slug like "constructor" must not resolve to a
// prototype member.
const REGISTRY = new Map<string, SkillIconData>([
  ...Object.entries(SIMPLE).map(([slug, i]) => [slug, fromSimple(i)] as const),
  ...Object.entries(CUSTOM_ICONS).map(([slug, c]) => [slug, fromCustom(c)] as const),
]);

export function getSkillIcon(slug: string | undefined): SkillIconData | null {
  if (!slug) return null;
  return REGISTRY.get(slug) ?? null;
}
