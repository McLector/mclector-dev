import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

/**
 * PLACEHOLDER — owned by Stream C (largest stream). Frozen contract:
 *   <PassCard profile={Profile} />
 * Final implementation renders <BadgeFallback> or lazily mounts
 * <LanyardCanvas> per src/lib/capability.ts's resolved tier, and honours
 * the `?e2e=1` deterministic mode for Playwright visual tests.
 * Stream C owns all of src/three/** and src/features/pass/**.
 */
export function PassCard({ profile }: { profile: Profile }) {
  return (
    <BentoCard area="pass" padded={false}>
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-[var(--color-text-muted)]">
          Stream C — lanyard badge · {profile.badge.caption}
        </p>
      </div>
    </BentoCard>
  );
}
