import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Owned by Stream A. Frozen contract (docs/contracts.md):
 *   <IntroCard profile={Profile} />
 *
 * The headline is the page's single <h1>: the two entries of
 * `profile.headline` are two visual lines of one heading, not two headings,
 * so assistive tech announces "Hello! I'm Myre Lector" as one label.
 *
 * Layout (from the approved mockup): the handle and the "Currently Active"
 * status share the top row; the bio is 11.5px so the whole left column fits
 * the 770px window; "Open to" is a chip row, not prose.
 */
export function IntroCard({ profile }: { profile: Profile }) {
  const [headlineTop, headlineBottom] = profile.headline;

  return (
    <BentoCard area="intro" as="section">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow as="p">{profile.handle}</Eyebrow>
          <ActiveStatus />
        </div>

        <h1
          className="font-[family-name:var(--font-display)] text-[30px] leading-[1.03] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]"
          style={{ overflowWrap: "anywhere" }}
        >
          <span className="block text-[var(--color-text-primary)]">
            {headlineTop}
          </span>
          <span className="block">{headlineBottom}</span>
        </h1>

        <p className="text-[11.5px] leading-[1.5] text-[var(--color-text-muted)]">
          <strong className="font-semibold text-[var(--color-text-secondary)]">
            {profile.bioLead}
          </strong>{" "}
          <span className="font-normal">{profile.bioRest}</span>
        </p>

        {profile.openTo.length > 0 ? (
          <div className="mt-px flex flex-wrap items-center gap-[5px]">
            <span className="mr-0.5 font-[family-name:var(--font-mono)] text-[8.5px] font-bold tracking-[0.14em] text-[var(--color-text-muted)] uppercase">
              Open to
            </span>
            {/* `contents` lets the chips flow in the same row as the label. */}
            <ul role="list" aria-label="Open to" className="contents">
              {profile.openTo.map((item) => (
                <li key={item} className="flex">
                  <Chip size="sm">{item}</Chip>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </BentoCard>
  );
}

/**
 * The online indicator. A ripple (not the location dot's slow pulse) so it reads
 * as "live", inside a capsule so it reads as a status claim. Green + motion
 * belongs to this alone — the location dot is a still arc-blue one.
 */
function ActiveStatus() {
  return (
    <span
      data-testid="active-status"
      className={[
        "inline-flex items-center gap-1.5 rounded-full py-[3px] pr-[9px] pl-[7px] whitespace-nowrap",
        "font-[family-name:var(--font-mono)] text-[8.5px] font-bold tracking-[0.11em] uppercase",
        "text-[var(--green-ink)]",
        "bg-[color-mix(in_oklab,var(--green)_15%,transparent)]",
        "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--green)_42%,transparent)]",
      ].join(" ")}
    >
      <i
        aria-hidden="true"
        className={[
          "relative block size-1.5 rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green)]",
          "after:absolute after:-inset-px after:rounded-full after:border-[1.5px] after:border-[var(--green)] after:content-['']",
          "after:animate-[status-ping_1.9s_cubic-bezier(0,0,0.2,1)_infinite]",
        ].join(" ")}
      />
      Currently Active
    </span>
  );
}
