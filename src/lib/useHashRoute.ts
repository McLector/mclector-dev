import { useCallback, useEffect, useState } from "react";

/**
 * The `#/project/:id` routing contract (docs/contracts.md — frozen; Stream
 * C's badge caption and any future cross-link may target it).
 *
 * Division of responsibility, deliberately:
 *
 *   - THIS MODULE knows the hash *format* only. It answers "what slug is in
 *     the address bar?", never "is that a real project?" — it has no access
 *     to content and must not grow one, or every consumer would have to
 *     import the project list just to route.
 *   - THE CONSUMER (`ProjectOverlay`) validates the slug against its
 *     `projects` prop. An id this module happily reports may still be stale
 *     or invented; the overlay renders nothing in that case and the grid
 *     shows through, per the contract ("an unknown slug renders the grid,
 *     not an error").
 *
 * Anything that is not exactly `#/project/<one non-empty segment>` parses to
 * `null`. The hash is editable text in the address bar, so malformed input
 * is the normal case, not an exception: nothing here throws.
 */

const PROJECT_HASH_PREFIX = "#/project/";

/**
 * `#/project/eiyu-system` → `"eiyu-system"`. Anything else → `null`.
 *
 * Rejected on purpose: an empty id (`#/project/`), the bare route
 * (`#/project`), nested segments (`#/project/a/b`), any id that decodes to
 * something containing a path separator or a relative-path segment
 * (`#/project/%2E%2E%2F...` — a traversal attempt has no meaning here, but
 * it must not reach a consumer either), whitespace-only ids, and broken
 * percent escapes (`decodeURIComponent` would throw).
 */
export function parseProjectHash(hash: string | null | undefined): string | null {
  if (!hash) return null;

  const withHash = hash.startsWith("#") ? hash : `#${hash}`;
  if (!withHash.startsWith(PROJECT_HASH_PREFIX)) return null;

  const raw = withHash.slice(PROJECT_HASH_PREFIX.length);
  if (!raw || raw.includes("/")) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null; // malformed percent escape
  }

  decoded = decoded.trim();
  if (!decoded) return null;
  if (decoded.includes("/") || decoded.includes("\\")) return null;
  if (decoded === "." || decoded === "..") return null;

  return decoded;
}

/** The inverse of {@link parseProjectHash}. Always percent-encodes the id. */
export function projectHash(id: string): string {
  return `${PROJECT_HASH_PREFIX}${encodeURIComponent(id)}`;
}

export type HashRoute = {
  /** The slug currently in the address bar, or `null`. NOT validated against content. */
  openProjectId: string | null;
  /** Navigates to `#/project/:id`, pushing a history entry so Back closes the detail view. */
  openProject: (id: string) => void;
  /** Clears the fragment entirely (`window.location.hash === ""`). */
  close: () => void;
};

/**
 * Keeps React state in sync with the fragment, in both directions.
 *
 * State is updated eagerly by `openProject`/`close` *and* by the browser's
 * `hashchange` event (Back/Forward, a hand-edited address bar, a pasted deep
 * link). The eager update is what makes a click feel instant; the listener is
 * what makes history navigation work. Both funnel through the same parser, so
 * they cannot disagree.
 */
export function useHashRoute(): HashRoute {
  const [openProjectId, setOpenProjectId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : parseProjectHash(window.location.hash),
  );

  useEffect(() => {
    const sync = () => setOpenProjectId(parseProjectHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    // The hash can change between the first render and this effect (an early
    // deep link, or a redirect); re-read once so we never start out stale.
    sync();
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const openProject = useCallback((id: string) => {
    const next = projectHash(id);
    window.location.hash = next;
    setOpenProjectId(parseProjectHash(next));
  }, []);

  const close = useCallback(() => {
    window.location.hash = "";
    setOpenProjectId(null);
  }, []);

  return { openProjectId, openProject, close };
}
