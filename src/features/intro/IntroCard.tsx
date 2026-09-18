import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

/**
 * PLACEHOLDER — owned by Stream A. Final contract (frozen, docs/contracts.md):
 *   <IntroCard profile={Profile} />
 * Stream A replaces this file's contents; it does not touch BentoGrid.tsx.
 */
export function IntroCard({ profile }: { profile: Profile }) {
  return (
    <BentoCard area="intro">
      <p className="text-xs text-[var(--color-text-muted)]">
        Stream A — Intro/bio/skills/actions · {profile.handle}
      </p>
    </BentoCard>
  );
}
