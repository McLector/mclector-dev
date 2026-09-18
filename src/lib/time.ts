import { useEffect, useState } from "react";

const UTC = "UTC";

/**
 * Cache of `Intl.DateTimeFormat` instances, keyed by zone. Constructing one
 * is the expensive part of formatting, and `useLocalClock` formats once a
 * second for the lifetime of the page.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function createFormatter(timeZone: string): Intl.DateTimeFormat {
  // `en-GB` + `hourCycle: "h23"` pins zero-padded 24-hour output ("00:05",
  // never "24:05" and never an AM/PM marker) regardless of the host locale.
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const key = typeof timeZone === "string" && timeZone ? timeZone : UTC;

  const cached = formatterCache.get(key);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = createFormatter(key);
  } catch {
    // An unknown IANA id is a content bug, not a reason to blank the card.
    // Fall back to UTC and cache that decision so we do not re-throw once
    // per second.
    formatter = getUtcFormatter();
  }

  formatterCache.set(key, formatter);
  return formatter;
}

function getUtcFormatter(): Intl.DateTimeFormat {
  const cached = formatterCache.get(UTC);
  if (cached) return cached;

  const formatter = createFormatter(UTC);
  formatterCache.set(UTC, formatter);
  return formatter;
}

/**
 * Formats `date` as "HH:MM" (24-hour) in the given IANA `timeZone`.
 * An invalid zone falls back to UTC rather than throwing.
 */
export function formatLocalTime(timeZone: string, date: Date): string {
  try {
    return getFormatter(timeZone).format(date);
  } catch {
    return getUtcFormatter().format(date);
  }
}

/**
 * Current wall-clock time in `timeZone`, re-formatted once per second.
 *
 * The interval is torn down on unmount (and re-created when `timeZone`
 * changes), so a card that scrolls away or a test that unmounts leaves no
 * timer behind.
 */
export function useLocalClock(timeZone: string): string {
  const [now, setNow] = useState(() => formatLocalTime(timeZone, new Date()));

  useEffect(() => {
    // Resync immediately: the zone may have changed since the last render.
    setNow(formatLocalTime(timeZone, new Date()));

    const id = setInterval(() => {
      setNow(formatLocalTime(timeZone, new Date()));
    }, 1000);

    return () => clearInterval(id);
  }, [timeZone]);

  return now;
}
