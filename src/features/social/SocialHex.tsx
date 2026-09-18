import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Social } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import {
  hexNeighbor,
  hexNeighborMap,
  type HexDirection,
  type HexLayout,
} from "@/lib/hexNeighbors";
import { SocialIcon } from "./SocialIcon";
import "./social.css";

const ARROW_DIRECTIONS: Record<string, HexDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** Only http(s) links leave the tab; `mailto:` must stay put. */
function isExternal(href: string): boolean {
  return /^https?:/i.test(href);
}

function groupByRow(layouts: HexLayout[]): HexLayout[][] {
  const rows: HexLayout[][] = [];
  for (const layout of layouts) {
    (rows[layout.row] ??= []).push(layout);
  }
  return rows;
}

/**
 * Stream D — the honeycomb of social links in the "social" bento area.
 *
 * Interaction model: one tab stop for the whole grid (roving `tabIndex`),
 * then arrow keys move between cells using the pure geometry in
 * `@/lib/hexNeighbors`. The platform label is revealed on hover *and* on
 * `:focus-visible`, but the accessible name comes from `aria-label`, so it is
 * never hover-dependent. The focus ring lives on an unclipped sibling of the
 * anchor — see social.css for why.
 */
export function SocialHex({ socials }: { socials: Social[] }) {
  const ordered = useMemo(
    () => [...socials].sort((a, b) => a.hexIndex - b.hexIndex),
    [socials],
  );
  const layouts = useMemo(() => hexNeighborMap(ordered.length), [ordered.length]);
  const rows = useMemo(() => groupByRow(layouts), [layouts]);

  const cellRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  // A shrinking list must never strand the tab stop on a cell that is gone.
  const activeIndex = Math.min(focusIndex, Math.max(ordered.length - 1, 0));

  const moveTo = useCallback((index: number) => {
    setFocusIndex(index);
    cellRefs.current[index]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const direction = ARROW_DIRECTIONS[event.key];
      if (direction) {
        event.preventDefault();
        const next = hexNeighbor(layouts, activeIndex, direction);
        if (next !== undefined) moveTo(next);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        if (ordered.length > 0) moveTo(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        if (ordered.length > 0) moveTo(ordered.length - 1);
        return;
      }

      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        // An anchor activates on Enter but not on Space. Routing both through
        // click() keeps the two keys identical instead of subtly different.
        if (event.shiftKey) return;
        event.preventDefault();
        cellRefs.current[activeIndex]?.click();
      }
    },
    [activeIndex, layouts, moveTo, ordered.length],
  );

  return (
    <BentoCard area="social">
      <div className="flex h-full flex-col justify-center gap-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          Elsewhere
        </h2>

        {ordered.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No social links yet.</p>
        ) : (
          <nav aria-label="Social links" className="hexgrid" onKeyDown={handleKeyDown}>
            {rows.map((row, rowIndex) => (
              <div className="hexgrid__row" key={rowIndex}>
                {row.map((layout) => {
                  const social = ordered[layout.index];
                  const external = isExternal(social.href);
                  return (
                    <div
                      className="hexgrid__cell"
                      data-hex-cell={layout.index}
                      key={social.id}
                    >
                      <span
                        className="hexgrid__ring"
                        data-hex-focus-ring=""
                        aria-hidden="true"
                      />
                      <a
                        className="hexgrid__link"
                        ref={(node) => {
                          cellRefs.current[layout.index] = node;
                        }}
                        href={social.href}
                        aria-label={social.label}
                        tabIndex={layout.index === activeIndex ? 0 : -1}
                        onFocus={() => setFocusIndex(layout.index)}
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        <SocialIcon name={social.icon} className="hexgrid__icon" />
                        <span className="hexgrid__label">{social.label}</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        )}
      </div>
    </BentoCard>
  );
}
