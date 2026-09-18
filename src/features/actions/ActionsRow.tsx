import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

/**
 * PLACEHOLDER — owned by Stream A. Frozen contract (docs/contracts.md):
 *   <ActionsRow profile={Profile} onContact={() => void} />
 * `onContact` is the ONLY outward call — Stream A does not implement the
 * contact form itself; Stream F owns ContactDialog and App.tsx wires them.
 */
export function ActionsRow({
  profile,
  onContact,
}: {
  profile: Profile;
  onContact: () => void;
}) {
  return (
    <BentoCard area="actions">
      <button
        type="button"
        onClick={onContact}
        className="text-xs text-[var(--color-text-muted)]"
      >
        Stream A — actions · CV available: {String(profile.cv.available)}
      </button>
    </BentoCard>
  );
}
