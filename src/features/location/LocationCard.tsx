import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

/**
 * PLACEHOLDER — owned by Stream B. Frozen contract:
 *   <LocationCard location={Profile["location"]} />
 * Stream B also owns src/lib/time.ts (formatLocalTime, useLocalClock).
 * Rendered inside the "place" grid area.
 */
export function LocationCard({ location }: { location: Profile["location"] }) {
  return (
    <BentoCard area="place">
      <p className="text-xs text-[var(--color-text-muted)]">
        Stream B — {location.city}, {location.country}
      </p>
    </BentoCard>
  );
}
