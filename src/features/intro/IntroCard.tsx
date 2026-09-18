import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

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
      <div className="flex h-full flex-col justify-center gap-4">
        <p className="text-xs font-medium tracking-[0.2em] text-[var(--color-text-muted)] uppercase">
          {profile.handle}
        </p>

        <h1
          className="font-[family-name:var(--font-display)] text-3xl leading-[1.02] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl"
          style={{ overflowWrap: "anywhere" }}
        >
          <span className="block bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
            {headlineTop}
          </span>
          <span className="block">{headlineBottom}</span>
        </h1>

        <p className="max-w-prose text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
          <strong className="font-semibold text-[var(--color-text-secondary)]">
            {profile.bioLead}
          </strong>{" "}
          <span className="font-normal">{profile.bioRest}</span>
        </p>
      </div>
    </BentoCard>
  );
}
