import type { ReactNode } from "react";
import type { Certification, CertificationStatus } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Pill } from "@/components/ui/Pill";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { cn } from "@/lib/cn";

/**
 * Stream G — the certifications card.
 *
 * Three render states, all designed (not just "doesn't crash"):
 *  - 0 items: the state v1 actually ships (src/content/certifications.ts is
 *    an empty array). A dashed, subdued placeholder that reads as "reserved,
 *    planned" rather than "broken or missing".
 *  - 1 item: a single row.
 *  - n items: an internally scrolled list. The desktop bento grid is
 *    `height: 100dvh; overflow: hidden` (src/layout/bento.css), so the card
 *    owns its own overflow — the list is capped at 12rem and scrolls inside
 *    the card instead of pushing the grid past the viewport.
 *
 * Status is always carried by a text label, never by colour alone
 * (WCAG 1.4.1); the pill tone is decoration on top of that label.
 */

const STATUS_META: Record<
  CertificationStatus,
  { label: string; tone: "positive" | "warning" | "neutral" }
> = {
  earned: { label: "Earned", tone: "positive" },
  "in-progress": { label: "In progress", tone: "warning" },
  planned: { label: "Planned", tone: "neutral" },
};

function StatusPill({ status }: { status: CertificationStatus }) {
  const { label, tone } = STATUS_META[status];
  return (
    <Pill tone={tone} className="shrink-0">
      <VisuallyHidden>Status: </VisuallyHidden>
      <span data-testid={`certification-status-${status}`}>{label}</span>
    </Pill>
  );
}

function RowBody({ cert }: { cert: Certification }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
        {cert.title}
      </span>
      <span className="truncate text-xs text-[var(--color-text-muted)]">
        {cert.issuer}
        {cert.issued ? ` · ${cert.issued}` : ""}
      </span>
    </div>
  );
}

function CertificationRow({ cert }: { cert: Certification }) {
  const rowClass = cn(
    "flex items-center gap-3 rounded-2xl px-3 py-2.5",
    "bg-white/[0.03] ring-1 ring-white/5",
  );

  const inner: ReactNode = (
    <>
      <RowBody cert={cert} />
      <StatusPill status={cert.status} />
    </>
  );

  return (
    <li>
      {cert.credentialUrl ? (
        <a
          href={cert.credentialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            rowClass,
            "transition-[colors,transform] duration-200 hover:bg-white/[0.07] hover:ring-white/15 active:scale-[0.98]",
          )}
        >
          {inner}
        </a>
      ) : (
        <div className={rowClass}>{inner}</div>
      )}
    </li>
  );
}

function EmptyState() {
  return (
    <div
      data-testid="certifications-empty"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2",
        "rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6 text-[var(--color-text-muted)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="9" r="5" />
        <path d="M8.5 13.2 7 21l5-2.4L17 21l-1.5-7.8" />
      </svg>
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
        Coming soon
      </p>
      <p className="max-w-[28ch] text-xs text-[var(--color-text-muted)]">
        Reserved for the credentials I'm working toward — planned, not missing.
      </p>
    </div>
  );
}

export function CertificationsCard({
  certifications,
}: {
  certifications: Certification[];
}) {
  return (
    <BentoCard area="certifications" as="section">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-[var(--font-display)] text-sm font-semibold tracking-wide text-[var(--color-text-primary)]">
            Certifications
          </h2>
          {certifications.length > 0 && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {certifications.length}
            </span>
          )}
        </div>

        {certifications.length === 0 ? (
          <EmptyState />
        ) : (
          <ul
            data-testid="certifications-list"
            // The card lives in a fixed-height, overflow-hidden desktop grid:
            // cap and scroll here so a long list can never blow out the grid.
            style={{ maxHeight: "12rem" }}
            className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1"
          >
            {certifications.map((cert) => (
              <CertificationRow key={cert.id} cert={cert} />
            ))}
          </ul>
        )}
      </div>
    </BentoCard>
  );
}
