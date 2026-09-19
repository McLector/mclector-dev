/**
 * A small registry of the brand marks the skills grid actually uses. Icons are
 * imported by name (never `import * as`), so the bundler tree-shakes the rest
 * of simple-icons away — importing the whole set would blow the initial-bundle
 * budget. A skill whose `icon` slug is missing here draws a lettered fallback.
 */
import {
  siArduino,
  siClaude,
  siCplusplus,
  siEspressif,
  siExpo,
  siFigma,
  siGit,
  siJavascript,
  siNextdotjs,
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

type SimpleIconLike = { path: string; hex: string; title: string };

const REGISTRY: Record<string, SimpleIconLike> = {
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
};

export function getSkillIcon(slug: string | undefined): SimpleIconLike | null {
  if (!slug) return null;
  return REGISTRY[slug] ?? null;
}
