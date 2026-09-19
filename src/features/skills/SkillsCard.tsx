import { useState, type CSSProperties, type PointerEvent } from "react";
import type { Skill } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { brandAccents } from "./brandAccent";
import { getSkillIcon } from "./skillIcons";
import { skillRows } from "./groupSkills";
import { SkillIcon } from "./SkillIcon";
import { SkillTooltip, type SkillTip } from "./SkillTooltip";

/**
 * Skills & Tools — the whole toolbelt as a compact 7-column logo grid in four
 * merged rows. Tiles are deliberately small; the name appears in a single
 * body-portaled tooltip on hover (see SkillTooltip), and every label also
 * stays in the DOM as visually-hidden text for assistive tech. With no skills
 * the card keeps its heading and shows a subdued line so the grid never gains
 * a dead cell.
 */
export function SkillsCard({ skills }: { skills: Skill[] }) {
  const rows = skillRows(skills);
  const [tip, setTip] = useState<SkillTip | null>(null);

  const showTip = (label: string) => (e: PointerEvent<HTMLElement>) => {
    // Touch has no hover; a tap-triggered tooltip would just get stuck open.
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, x: r.left + r.width / 2, y: r.top });
  };
  const hideTip = () => setTip(null);

  return (
    <BentoCard area="skills" as="section" grow>
      <div className="flex h-full flex-col gap-[5px]">
        <Eyebrow as="h2">Skills &amp; Tools</Eyebrow>

        {rows.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {rows.map((row) => (
              <section key={row.label} className="flex flex-col gap-1">
                <h3 className="mt-0.5 text-[8.5px] leading-[normal] font-bold tracking-[0.1em] text-[color-mix(in_oklab,var(--color-text-primary)_62%,var(--arc)_38%)] uppercase">
                  {row.label}
                </h3>
                <ul className="grid grid-cols-7 gap-1">
                  {row.skills.map((skill, index) => (
                    <SkillTile
                      key={skill.id}
                      skill={skill}
                      index={index}
                      onEnter={showTip(skill.label)}
                      onLeave={hideTip}
                    />
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
      <SkillTooltip tip={tip} />
    </BentoCard>
  );
}

function SkillTile({
  skill,
  index,
  onEnter,
  onLeave,
}: {
  skill: Skill;
  index: number;
  onEnter: (e: PointerEvent<HTMLElement>) => void;
  onLeave: () => void;
}) {
  const icon = getSkillIcon(skill.icon);
  // The accent drives the hover tint/glow; near-black brands clamp to the arc
  // cyan so the glow stays visible (see brandAccent). `--brand` flips by theme.
  const accents = brandAccents(icon?.hex);

  return (
    <li
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className={[
        "group/skill relative grid aspect-square place-items-center rounded-lg",
        "text-[var(--color-text-secondary)]",
        "bg-[var(--tile-bg)]",
        "ring-1 ring-inset ring-[var(--tile-ring)]",
        "transition-[transform,box-shadow,background-color,color] duration-150 ease-out",
        "[--brand:var(--brand-dark)] light:[--brand:var(--brand-light)]",
        "hover-fine:-translate-y-0.5",
        "hover-fine:bg-[color-mix(in_oklab,var(--brand)_30%,transparent)]",
        "hover-fine:text-[var(--color-text-primary)]",
        "hover-fine:shadow-[0_4px_14px_-4px_var(--brand),inset_0_0_0_1px_color-mix(in_oklab,var(--brand)_55%,transparent)]",
        "animate-[chip-enter_0.3s_cubic-bezier(0.22,1,0.36,1)_both]",
      ].join(" ")}
      style={
        {
          animationDelay: `${index * 20}ms`,
          "--brand-dark": accents.dark,
          "--brand-light": accents.light,
        } as CSSProperties
      }
    >
      <SkillIcon
        skill={skill}
        className={icon ? "size-[64%]" : "text-[7px] leading-none font-bold"}
      />
      <VisuallyHidden>{skill.label}</VisuallyHidden>
    </li>
  );
}
