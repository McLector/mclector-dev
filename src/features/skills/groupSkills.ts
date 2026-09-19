import type { Skill, SkillGroup } from "@/content/types";

/** The order groups appear in the skills grid. */
export const GROUP_ORDER: SkillGroup[] = [
  "language",
  "mobile",
  "web",
  "data",
  "hardware",
  "tooling",
];

/** Human-readable section headings. */
export const GROUP_LABELS: Record<SkillGroup, string> = {
  language: "Languages",
  mobile: "Mobile",
  web: "Web",
  data: "Data",
  hardware: "Hardware",
  tooling: "Tooling",
};

export type SkillGroupBucket = {
  group: SkillGroup;
  label: string;
  skills: Skill[];
};

/**
 * Bucket skills by group in {@link GROUP_ORDER}, dropping empty groups. Within
 * a group, featured skills sort first; ties keep input order (a stable sort).
 * Every input skill is preserved.
 */
export function groupSkills(skills: Skill[]): SkillGroupBucket[] {
  const buckets = new Map<SkillGroup, Skill[]>();
  for (const skill of skills) {
    const list = buckets.get(skill.group) ?? [];
    list.push(skill);
    buckets.set(skill.group, list);
  }

  const result: SkillGroupBucket[] = [];
  for (const group of GROUP_ORDER) {
    const list = buckets.get(group);
    if (!list || list.length === 0) continue;
    const sorted = [...list].sort(
      (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
    );
    result.push({ group, label: GROUP_LABELS[group], skills: sorted });
  }
  return result;
}
