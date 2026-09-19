import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Owned by Stream A. Frozen contract (docs/contracts.md):
 *   <IntroCard profile={Profile} />
 *
 * The headline is the page's single <h1>: the two entries of
 * `profile.headline` are two visual lines of one heading, not two headings,
 * so assistive tech announces "Hello! I'm Myre Lector" as one label.
 */
export function IntroCard({ profile }: { profile: Profile }) {
  const [headlineTop, headlineBottom] = profile.headline;

  return (
    <BentoCard area="intro" as="section">
      <div className="flex h-full flex-col justify-center gap-2.5">
        <Eyebrow as="p">{profile.handle}</Eyebrow>

        <h1
          className="font-[family-name:var(--font-display)] text-[30px] leading-[1.03] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]"
          style={{ overflowWrap: "anywhere" }}
        >
          <span className="block text-[var(--color-text-primary)]">
            {headlineTop}
          </span>
          <span className="block">{headlineBottom}</span>
        </h1>

        <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)]">
          <strong className="font-semibold text-[var(--color-text-secondary)]">
            {profile.bioLead}
          </strong>{" "}
          <span className="font-normal">{profile.bioRest}</span>
        </p>
      </div>
    </BentoCard>
  );
}
