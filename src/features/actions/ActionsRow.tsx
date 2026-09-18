import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Button } from "@/components/ui/Button";

/**
 * Owned by Stream A. Frozen contract (docs/contracts.md):
 *   <ActionsRow profile={Profile} onContact={() => void} />
 * `onContact` is the ONLY outward call — Stream A does not implement the
 * contact form itself; Stream F owns ContactDialog and App.tsx wires them.
 *
 * The CV action is never hidden. Until a real PDF exists it renders as a
 * visibly inert control with a reason attached, so a recruiter reads
 * "not ready yet" rather than "this person has no CV".
 */
export function ActionsRow({
  profile,
  onContact,
}: {
  profile: Profile;
  onContact: () => void;
}) {
  const { cv } = profile;
  const cvReady = cv.available && Boolean(cv.href);

  return (
    <BentoCard area="actions" as="section">
      <div className="flex h-full flex-wrap items-center gap-3">
        <Button type="button" variant="primary" onClick={onContact}>
          Contact me
        </Button>

        {cvReady ? (
          // `Button` renders a <button> only and has no `as`/`asChild` escape
          // hatch, so a real navigation has to be an <a> styled to match the
          // secondary variant locally. See the note in the Stream A report.
          <a
            href={cv.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] ring-1 ring-white/15 transition-colors hover:bg-white/15"
          >
            {cv.label}
          </a>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled
            aria-disabled="true"
            title="CV coming soon"
          >
            {cv.label}
          </Button>
        )}
      </div>
    </BentoCard>
  );
}
