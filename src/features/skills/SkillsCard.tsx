import type { Skill } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Chip } from "@/components/ui/Chip";

/**
 * Owned by Stream A. Frozen contract: <SkillsCard skills={Skill[]} />
 *
 * Only `featured` skills are chipped here — the full list is deliberately
 * not dumped into the grid. With zero featured skills the card keeps its
 * heading and shows a subdued line instead of collapsing to an empty box,
 * so the bento grid never gains a visually dead cell.
 */
export function SkillsCard({ skills }: { skills: Skill[] }) {
  const featured = skills.filter((skill) => skill.featured);

  return (
    <BentoCard area="skills" as="section">
      <div className="flex h-full flex-col gap-3">
        <h2 className="text-xs font-medium tracking-[0.18em] text-[var(--color-text-muted)] uppercase">
          Skills
        </h2>

        {featured.length > 0 ? (
          <ul className="flex flex-wrap content-start gap-2">
            {featured.map((skill) => (
              <li key={skill.id}>
                <Chip>{skill.label}</Chip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] italic">
            Skills coming soon.
          </p>
        )}
      </div>
    </BentoCard>
  );
}
