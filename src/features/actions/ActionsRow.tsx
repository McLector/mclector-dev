import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Button, buttonClasses } from "@/components/ui/Button";

/**
 * Frozen contract (docs/contracts.md):
 *   <ActionsRow profile={Profile} />
 *
 * Now just the Download CV control, centred under the hologram's "Digital
 * Pass" caption on the same axis as the pedestal and the contact sign. (The
 * "Contact me" button and its dialog are gone — contact is the sign's mailto.)
 *
 * The CV action is never hidden. Until a real PDF exists it renders as a
 * visibly inert control with a reason attached, so a recruiter reads
 * "not ready yet" rather than "this person has no CV".
 */
export function ActionsRow({ profile }: { profile: Profile }) {
  const { cv } = profile;
  const cvReady = cv.available && Boolean(cv.href);

  return (
    // Bare + unpadded: a free-floating pill, not a big glass box.
    <BentoCard area="actions" as="section" bare padded={false}>
      <div className="flex items-center justify-center">
        {cvReady ? (
          // A real navigation has to be an <a>, which <button> cannot
          // semantically be — buttonClasses() keeps it visually consistent
          // without duplicating the class list.
          <a
            href={cv.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("downloadReady", { size: "slim" })}
          >
            <DownloadIcon />
            {cv.label}
          </a>
        ) : (
          <Button
            type="button"
            variant="download"
            size="slim"
            disabled
            aria-disabled="true"
            title="CV coming soon"
          >
            <DownloadIcon />
            {cv.label}
          </Button>
        )}
      </div>
    </BentoCard>
  );
}

/** Decorative — the label carries the accessible name. */
function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
    </svg>
  );
}
