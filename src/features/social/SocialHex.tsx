import type { Social } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

/**
 * PLACEHOLDER — owned by Stream D. Frozen contract: <SocialHex socials={Social[]} />
 * Stream D also owns src/lib/hexNeighbors.ts and its own inline SVG icon set.
 * Rendered inside the "social" grid area, above ProjectsCard.
 */
export function SocialHex({ socials }: { socials: Social[] }) {
  return (
    <BentoCard area="social">
      <p className="text-xs text-[var(--color-text-muted)]">
        Stream D — {socials.length} social links
      </p>
    </BentoCard>
  );
}
