import type { CSSProperties } from "react";
import type { Profile } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/cn";
import { useLocalClock } from "@/lib/time";

type LocationCardProps = { location: Profile["location"] };

/**
 * Builds the decorative map layer for `mapTexture`. `src` is undefined by
 * design in v1 (see `ImageRef` in src/content/types.ts), so the placeholder
 * descriptor is painted as CSS — a broken <img> is never rendered.
 */
function mapPlaceholderStyle(
  mapTexture: Profile["location"]["mapTexture"],
): CSSProperties {
  const { from, to } = mapTexture.placeholder;

  return {
    backgroundColor: to,
    backgroundImage: [
      `radial-gradient(120% 90% at 50% 12%, ${from} 0%, transparent 62%)`,
      `repeating-linear-gradient(45deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 12px)`,
      `repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 12px)`,
      `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
    ].join(", "),
  };
}

/**
 * The "place" card: where I am, and what time it is there right now. The
 * clock ticks once a second via `useLocalClock`, which tears its interval
 * down on unmount.
 */
export function LocationCard({ location }: LocationCardProps) {
  // Live Philippine wall clock, ticking down to the second.
  const localTime = useLocalClock(location.timeZone, true);

  return (
    <BentoCard area="place">
      <div
        aria-hidden="true"
        data-testid="map-placeholder"
        className="pointer-events-none absolute inset-0 opacity-60 light:opacity-[0.1]"
        style={mapPlaceholderStyle(location.mapTexture)}
      />
      {/* A faint accent wash so the clock reads as "alive", not a flat panel.
          Aimed at the top CENTRE, like the map layer, because the content is centred. */}
      <div
        aria-hidden="true"
        data-testid="location-wash"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--color-accent-cyan) 26%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* Centred on the card's vertical centre line. The card is content-sized (no `grow`), so
          only the horizontal axis needs centring — there is no spare height to distribute. */}
      <div
        data-testid="location-content"
        className="relative flex h-full flex-col items-center text-center"
      >
        <div className="flex items-center justify-center gap-2">
          {/* A still arc-blue dot: green + motion now belongs only to the intro
              card's "Currently Active" status. */}
          <span
            data-testid="location-status-dot"
            aria-hidden="true"
            className={cn(
              "inline-block size-[7px] shrink-0 rounded-full",
              "bg-[var(--arc)] shadow-[0_0_9px_var(--arc)]",
            )}
          />
          <p className="truncate text-[13px] leading-[normal] font-semibold text-[var(--color-text-primary)]">
            {`${location.city}, ${location.country}`}
          </p>
        </div>

        <p
          data-testid="local-clock"
          // mb tuned by measurement against the approved round-2 mockup (card 102px tall, 13px above
          // and below): the earlier 11.5px matched the round-1 mockup, whose eyebrow sat in a block
          // container with a line-box strut that this flex column does not have.
          className="mt-[7px] mb-[6.25px] text-[30px] leading-none tabular-nums text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}
        >
          {localTime}
        </p>
        {/* .eyebrow's 0.2em letter-spacing leaves empty space after the last glyph; pull it back so
            the VISIBLE text (not its box) is what sits on the axis. */}
        <Eyebrow as="p" className="-mr-[0.2em]">
          {`${location.utcLabel} · Manila`}
        </Eyebrow>
      </div>
    </BentoCard>
  );
}
