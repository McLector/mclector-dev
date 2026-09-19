import { describe, expect, it } from "vitest";
import type { Skill } from "@/content/types";
import { GROUP_LABELS, groupSkills, skillRows } from "./groupSkills";

const s = (id: string, group: Skill["group"], featured = false): Skill => ({
  id,
  label: id,
  group,
  featured,
});

describe("groupSkills", () => {
  it("groups skills by their group in the canonical order", () => {
    const result = groupSkills([
      s("git", "tooling"),
      s("ts", "language"),
      s("expo", "mobile"),
    ]);
    expect(result.map((g) => g.group)).toEqual(["language", "mobile", "tooling"]);
  });

  it("omits groups that have no skills", () => {
    const result = groupSkills([s("ts", "language")]);
    expect(result).toHaveLength(1);
    expect(result[0].group).toBe("language");
  });

  it("labels each group with its display name", () => {
    const result = groupSkills([s("ts", "language"), s("sb", "data")]);
    expect(result[0].label).toBe(GROUP_LABELS.language);
    expect(result[1].label).toBe(GROUP_LABELS.data);
  });

  it("sorts featured skills first within a group, keeping input order otherwise", () => {
    const result = groupSkills([
      s("a", "web"),
      s("b", "web", true),
      s("c", "web"),
      s("d", "web", true),
    ]);
    expect(result[0].skills.map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("returns an empty array for no skills", () => {
    expect(groupSkills([])).toEqual([]);
  });

  it("keeps every skill (nothing dropped)", () => {
    const input = [
      s("ts", "language"),
      s("py", "language"),
      s("git", "tooling"),
      s("esp", "hardware"),
    ];
    const total = groupSkills(input).reduce((n, g) => n + g.skills.length, 0);
    expect(total).toBe(input.length);
  });
});

describe("skillRows", () => {
  it("merges the six data groups into the four display rows, in order", () => {
    const rows = skillRows([
      s("git", "tooling"),
      s("esp", "hardware"),
      s("sb", "data"),
      s("nx", "web"),
      s("expo", "mobile"),
      s("ts", "language"),
    ]);
    expect(rows.map((r) => r.label)).toEqual([
      "Languages · Mobile",
      "Web · Data",
      "Hardware · Design · PM",
      "Tools · APIs",
    ]);
  });

  it("concatenates constituent groups in order, featured-first within each", () => {
    const rows = skillRows([
      s("py", "language"),
      s("ts", "language", true),
      s("expo", "mobile"),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].skills.map((x) => x.id)).toEqual(["ts", "py", "expo"]);
  });

  it("drops rows with no skills", () => {
    const rows = skillRows([s("git", "tooling")]);
    expect(rows.map((r) => r.label)).toEqual(["Tools · APIs"]);
  });

  it("returns an empty array for no skills", () => {
    expect(skillRows([])).toEqual([]);
  });

  it("never drops a skill", () => {
    const input = [
      s("a", "language"),
      s("b", "mobile"),
      s("c", "web"),
      s("d", "data"),
      s("e", "hardware"),
      s("f", "tooling"),
    ];
    const total = skillRows(input).reduce((n, r) => n + r.skills.length, 0);
    expect(total).toBe(input.length);
  });
});
