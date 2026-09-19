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

/**
 * How the six data groups are presented: four merged headings, matching the
 * approved mockup. The `SkillGroup` type stays the data model; this is purely
 * a display layer.
 */
export const DISPLAY_ROWS: { label: string; groups: SkillGroup[] }[] = [
  { label: "Languages · Mobile", groups: ["language", "mobile"] },
  { label: "Web · Data", groups: ["web", "data"] },
  { label: "Hardware · Design · PM", groups: ["hardware"] },
  { label: "Tools · APIs", groups: ["tooling"] },
];

/**
 * Skills bucketed into {@link DISPLAY_ROWS}. Reuses {@link groupSkills} for the
 * featured-first stable sort within each group, then concatenates the groups a
 * row spans in order. Empty rows are dropped and no skill is lost.
 */
export function skillRows(skills: Skill[]): SkillGroupBucket[] {
  const byGroup = new Map(groupSkills(skills).map((b) => [b.group, b] as const));
  const rows: SkillGroupBucket[] = [];
  for (const row of DISPLAY_ROWS) {
    const merged = row.groups.flatMap((g) => byGroup.get(g)?.skills ?? []);
    if (merged.length === 0) continue;
    rows.push({ group: row.groups[0], label: row.label, skills: merged });
  }
  return rows;
}
