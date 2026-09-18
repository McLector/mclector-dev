import type { Skill } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

/**
 * PLACEHOLDER — owned by Stream A. Frozen contract: <SkillsCard skills={Skill[]} />
 */
export function SkillsCard({ skills }: { skills: Skill[] }) {
  return (
    <BentoCard area="skills">
      <p className="text-xs text-[var(--color-text-muted)]">
        Stream A — {skills.length} skills
      </p>
    </BentoCard>
  );
}
