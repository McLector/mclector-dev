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
      `radial-gradient(120% 90% at 18% 12%, ${from} 0%, transparent 62%)`,
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
        className="pointer-events-none absolute inset-0 opacity-60"
        style={mapPlaceholderStyle(location.mapTexture)}
      />
      {/* A faint accent wash so the clock reads as "alive", not a flat panel. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 85% 0%, color-mix(in oklab, var(--color-accent-cyan) 26%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex h-full flex-col justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            data-testid="location-status-dot"
            aria-hidden="true"
            className={cn(
              "inline-block size-2 shrink-0 rounded-full",
              "bg-[var(--color-accent-green)]",
              "animate-[status-pulse_2.6s_ease-in-out_infinite]",
            )}
          />
          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {`${location.city}, ${location.country}`}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p
            data-testid="local-clock"
            className="text-[clamp(2rem,1.4rem+2.6vw,3rem)] leading-none tabular-nums text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}
          >
            {localTime}
          </p>
          <Eyebrow as="p">{`${location.utcLabel} · Manila`}</Eyebrow>
        </div>
      </div>
    </BentoCard>
  );
}
