import type { ReactNode } from "react";
import type { Certification, CertificationStatus } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
    "bg-[color-mix(in_oklab,var(--color-text-primary)_4%,transparent)] ring-1 ring-[var(--glass-border)]",
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
            "transition-[colors,transform] duration-200 hover:bg-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)] hover:ring-[var(--glass-highlight)] active:scale-[0.98]",
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
        "flex items-center gap-3",
        "rounded-2xl border border-dashed border-[var(--glass-border)] px-3.5 py-3 text-left",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0 text-[var(--color-text-muted)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="9" r="5" />
        <path d="M8.5 13.2 7 21l5-2.4L17 21l-1.5-7.8" />
      </svg>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[12.5px] font-semibold text-[var(--color-text-secondary)]">
          Coming soon
        </p>
        <p className="text-[10px] leading-snug text-[var(--color-text-muted)]">
          Reserved for the credentials I'm working toward — planned, not missing.
        </p>
      </div>
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
      <div className="flex h-full min-h-0 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <Eyebrow as="h2">Certifications</Eyebrow>
          {certifications.length > 0 && (
            <span className="count font-mono">{certifications.length}</span>
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
