import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Button, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import "./actions.css";

/**
 * Frozen contract (docs/contracts.md):
 *   <ActionsRow profile={Profile} />
 *
 * Now just the Download CV control, centred under the hologram's "Digital
 * Pass" caption on the same axis as the pedestal and the contact sign. (The
 * "Contact me" button and its dialog are gone — contact is the sign's Gmail link.)
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
    // `clip={false}`: the hover glow reaches past the pill, so the card must not cut it off at its own edge.
    <BentoCard area="actions" as="section" bare padded={false} clip={false}>
      <div className="flex items-center justify-center">
        {cvReady ? (
          // A real link has to be an <a>, which <button> cannot semantically
          // be — buttonClasses() keeps the face visually consistent without
          // duplicating the class list. `download` saves the file instead of
          // opening it in a tab; the PDF is same-origin, so browsers honour it.
          // (vercel.json also serves it as an attachment, for in-app browsers
          // that ignore the attribute.) The link stays still and the inner
          // face does the lift and glow: see actions.css.
          <a href={cv.href} download className="cv-link inline-flex rounded-full">
            <span className={cn(buttonClasses("downloadReady", { size: "slim" }), "cv-face")}>
              <DownloadIcon />
              {cv.label}
            </span>
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
