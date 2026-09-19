import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Button, buttonClasses } from "@/components/ui/Button";

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
    // Bare + unpadded: the actions are free-floating pills, not a big glass box.
    <BentoCard area="actions" as="section" bare padded={false}>
      <div className="flex h-full flex-wrap items-center gap-2.5">
        <Button type="button" variant="primary" onClick={onContact}>
          Contact me
        </Button>

        {cvReady ? (
          // A real navigation has to be an <a>, which <button> cannot
          // semantically be — buttonClasses() keeps it visually identical
          // to Button's secondary variant without duplicating the class list.
          <a href={cv.href} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}>
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
