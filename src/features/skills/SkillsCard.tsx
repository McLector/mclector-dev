import type { CSSProperties } from "react";
import type { Skill } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { getSkillIcon } from "./skillIcons";
import { groupSkills } from "./groupSkills";
import { SkillIcon } from "./SkillIcon";

/**
 * Skills & Tools, presented as a grouped icon grid (all skills, not a featured
 * subset) — the whole toolbelt at a glance. Each tile carries the brand mark;
 * hovering lifts it and glows in the brand colour (`--brand`), while the label
 * stays legible beneath. With no skills the card keeps its heading and shows a
 * subdued line so the grid never gains a dead cell.
 */
export function SkillsCard({ skills }: { skills: Skill[] }) {
  const groups = groupSkills(skills);

  return (
    <BentoCard area="skills" as="section">
      <div className="flex h-full flex-col gap-4">
        <h2 className="font-[family-name:var(--font-mono)] text-[0.7rem] font-medium tracking-[0.2em] text-[var(--color-text-muted)] uppercase">
          Skills &amp; Tools
        </h2>

        {groups.length > 0 ? (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <section key={group.group} className="flex flex-col gap-1.5">
                <h3 className="text-[0.66rem] font-semibold tracking-[0.06em] text-[var(--color-text-secondary)]">
                  {group.label}
                </h3>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(54px,1fr))] gap-1.5">
                  {group.skills.map((skill, index) => (
                    <SkillTile key={skill.id} skill={skill} index={index} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] italic">
            Skills coming soon.
          </p>
        )}
      </div>
    </BentoCard>
  );
}

function SkillTile({ skill, index }: { skill: Skill; index: number }) {
  const icon = getSkillIcon(skill.icon);
  // The brand colour drives the hover glow/tint. Fall back to the theme accent
  // for skills with no brand mark.
  const brand = icon ? `#${icon.hex}` : "var(--color-accent-blue)";

  return (
    <li
      className="animate-[chip-enter_0.3s_cubic-bezier(0.22,1,0.36,1)_both]"
      style={{ animationDelay: `${index * 30}ms`, ["--brand" as string]: brand } as CSSProperties}
    >
      <div
        title={skill.label}
        className={[
          "group/skill flex h-full flex-col items-center gap-1 rounded-lg px-1 py-2",
          "bg-[color-mix(in_oklab,var(--color-text-primary)_5%,transparent)]",
          "ring-1 ring-[var(--glass-border)] transition-[transform,box-shadow,background-color] duration-200",
          "hover-fine:-translate-y-0.5",
          "hover-fine:bg-[color-mix(in_oklab,var(--brand)_16%,transparent)]",
          "hover-fine:shadow-[0_8px_20px_-10px_var(--brand)]",
        ].join(" ")}
      >
        <SkillIcon
          skill={skill}
          className="size-[1.15rem] text-[var(--color-text-secondary)] transition-colors duration-200 group-hover/skill:text-[var(--brand)]"
        />
        <span className="w-full truncate text-center text-[0.56rem] leading-tight text-[var(--color-text-muted)]">
          {skill.label}
        </span>
      </div>
    </li>
  );
}
