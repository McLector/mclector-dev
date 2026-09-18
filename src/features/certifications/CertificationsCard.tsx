import type { Certification } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

/**
 * PLACEHOLDER — owned by Stream G. Frozen contract:
 *   <CertificationsCard certifications={Certification[]} />
 * Must render a designed empty state at 0 items (v1 ships empty), and
 * correctly at 1 and 6 items for when the list is filled in later.
 */
export function CertificationsCard({
  certifications,
}: {
  certifications: Certification[];
}) {
  return (
    <BentoCard area="certifications">
      <p className="text-xs text-[var(--color-text-muted)]">
        Stream G — {certifications.length} certifications
      </p>
    </BentoCard>
  );
}
