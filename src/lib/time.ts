import { useEffect, useState } from "react";

const UTC = "UTC";

/**
 * Cache of `Intl.DateTimeFormat` instances, keyed by zone. Constructing one
 * is the expensive part of formatting, and `useLocalClock` formats once a
 * second for the lifetime of the page.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function cacheKey(timeZone: string, withSeconds: boolean): string {
  return `${timeZone}|${withSeconds ? "s" : "m"}`;
}

function createFormatter(timeZone: string, withSeconds: boolean): Intl.DateTimeFormat {
  // `en-GB` + `hourCycle: "h23"` pins zero-padded 24-hour output ("00:05",
  // never "24:05" and never an AM/PM marker) regardless of the host locale.
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  });
}

function getFormatter(timeZone: string, withSeconds: boolean): Intl.DateTimeFormat {
  const zone = typeof timeZone === "string" && timeZone ? timeZone : UTC;
  const key = cacheKey(zone, withSeconds);

  const cached = formatterCache.get(key);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = createFormatter(zone, withSeconds);
  } catch {
    // An unknown IANA id is a content bug, not a reason to blank the card.
    // Fall back to UTC and cache that decision so we do not re-throw once
    // per second.
    formatter = getUtcFormatter(withSeconds);
  }

  formatterCache.set(key, formatter);
  return formatter;
}

function getUtcFormatter(withSeconds: boolean): Intl.DateTimeFormat {
  const key = cacheKey(UTC, withSeconds);
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const formatter = createFormatter(UTC, withSeconds);
  formatterCache.set(key, formatter);
  return formatter;
}

/**
 * Formats `date` as "HH:MM" (24-hour) in the given IANA `timeZone`.
 * An invalid zone falls back to UTC rather than throwing.
 */
export function formatLocalTime(timeZone: string, date: Date): string {
  try {
    return getFormatter(timeZone, false).format(date);
  } catch {
    return getUtcFormatter(false).format(date);
  }
}

/**
 * Formats `date` as "HH:MM:SS" (24-hour) in the given IANA `timeZone` — the
 * live, ticking clock. An invalid zone falls back to UTC rather than throwing.
 */
export function formatLocalTimeWithSeconds(timeZone: string, date: Date): string {
  try {
    return getFormatter(timeZone, true).format(date);
  } catch {
    return getUtcFormatter(true).format(date);
  }
}

/**
 * Current wall-clock time in `timeZone`, re-formatted once per second.
 *
 * The interval is torn down on unmount (and re-created when `timeZone`
 * changes), so a card that scrolls away or a test that unmounts leaves no
 * timer behind.
 */
export function useLocalClock(timeZone: string, withSeconds = false): string {
  const format = withSeconds ? formatLocalTimeWithSeconds : formatLocalTime;
  const [now, setNow] = useState(() => format(timeZone, new Date()));

  useEffect(() => {
    // Resync immediately: the zone or precision may have changed since the
    // last render.
    setNow(format(timeZone, new Date()));

    const id = setInterval(() => {
      setNow(format(timeZone, new Date()));
    }, 1000);

    return () => clearInterval(id);
  }, [timeZone, withSeconds, format]);

  return now;
}
