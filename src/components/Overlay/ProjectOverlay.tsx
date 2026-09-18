import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type { Project, ProjectLink } from "@/content/types";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useHashRoute } from "@/lib/useHashRoute";
import { projectLayoutId, statusLabel, thumbnailStyle } from "@/features/projects/thumbnail";

/**
 * The project detail view. Always mounted (App.tsx) and driven entirely by
 * the `#/project/:id` hash, so a deep link, a Back press and a row click all
 * arrive through one path.
 *
 * `useHashRoute` reports the raw slug; VALIDATING it is this component's job
 * (see the note in src/lib/useHashRoute.ts). A slug that matches no project
 * — stale link, typo, hand-edited URL — renders nothing at all, so the grid
 * shows through, per docs/contracts.md ("an unknown slug renders the grid,
 * not an error"). No broken empty dialog.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

/** External links open in a new tab; `mailto:`/`tel:` hand off to the OS instead. */
function isExternal(href: ProjectLink["href"]): boolean {
  return /^https?:/i.test(href);
}

export function ProjectOverlay({ projects }: { projects: Project[] }) {
  const { openProjectId, close } = useHashRoute();
  const reducedMotion = usePrefersReducedMotion();

  const project =
    openProjectId === null
      ? undefined
      : projects.find((candidate) => candidate.id === openProjectId);
  const open = project !== undefined;

  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** The element that had focus when we opened, so we can hand it back. */
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useFocusTrap(dialogRef, open);

  // Page-level side effects of being open: the grid behind is inert (so it
  // is out of the tab order AND out of the a11y tree), the body does not
  // scroll behind the dialog, and focus comes back where it started. All of
  // it is undone by this effect's cleanup, including on unmount.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // App.tsx's <main> is a stable, pre-existing landmark; we query it rather
    // than asking App.tsx for a ref, so the overlay stays self-contained.
    const background = document.querySelector("main");
    background?.setAttribute("inert", "");

    const previousOverflow = document.body.style.overflow;
    const previousGutter = document.body.style.scrollbarGutter;
    document.body.style.overflow = "hidden";
    document.body.style.scrollbarGutter = "stable";

    return () => {
      background?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      document.body.style.scrollbarGutter = previousGutter;

      const toRestore = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (toRestore && document.contains(toRestore)) toRestore.focus();
    };
  }, [open]);

  // Focus the heading — separately from the effect above, so switching
  // directly from one project to another re-announces the new title without
  // tearing down (and wrongly restoring) focus in between.
  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
  }, [open, project?.id]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    },
    [close],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  if (typeof document === "undefined") return null;

  const titleId = project ? `project-overlay-title-${project.id}` : undefined;

  return createPortal(
    <AnimatePresence>
      {project && (
        <motion.div
          key="project-overlay"
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.12 : 0.18 }}
        >
          <div
            data-testid="project-overlay-backdrop"
            aria-hidden="true"
            onClick={close}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="project-overlay"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-[var(--radius-card)] bg-neutral-950/95 p-6 ring-1 ring-white/12 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:p-8"
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs text-[var(--color-text-muted)] ring-1 ring-white/12 transition-[colors,transform] duration-200 hover:bg-white/8 hover:text-[var(--color-text-primary)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-blue)]"
            >
              Close
            </button>

            <div className="flex items-center gap-4 pr-20">
              {reducedMotion ? (
                <span
                  data-testid="project-overlay-thumb"
                  aria-hidden="true"
                  style={thumbnailStyle(project.thumbnail)}
                  className="size-14 shrink-0 rounded-2xl ring-1 ring-white/12"
                />
              ) : (
                <motion.span
                  layoutId={projectLayoutId(project.id)}
                  data-layout-id={projectLayoutId(project.id)}
                  data-testid="project-overlay-thumb"
                  aria-hidden="true"
                  style={thumbnailStyle(project.thumbnail)}
                  className="size-14 shrink-0 rounded-2xl ring-1 ring-white/12"
                />
              )}

              <div className="flex min-w-0 flex-col gap-1">
                <h2
                  id={titleId}
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-xl font-semibold text-[var(--color-text-primary)] outline-none sm:text-2xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {project.title}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">{project.subtitle}</p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <dt className="text-[var(--color-text-muted)]">Role</dt>
                <dd className="text-[var(--color-text-primary)]">{project.role}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[var(--color-text-muted)]">Status</dt>
                <dd className="text-[var(--color-text-primary)]">{statusLabel(project.status)}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[var(--color-text-muted)]">Year</dt>
                <dd className="text-[var(--color-text-primary)]">{project.year}</dd>
              </div>
            </dl>

            {project.stack.length > 0 && (
              <ul
                data-testid="project-overlay-stack"
                className="mt-5 flex flex-wrap gap-2"
                aria-label="Stack"
              >
                {project.stack.map((tech) => (
                  <li
                    key={tech}
                    className="inline-flex items-center rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] ring-1 ring-white/10"
                  >
                    {tech}
                  </li>
                ))}
              </ul>
            )}

            <div
              data-testid="project-overlay-description"
              className="mt-6 flex flex-col gap-3 text-sm leading-relaxed text-[var(--color-text-secondary)]"
            >
              {project.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {project.links.length > 0 && (
              <div data-testid="project-overlay-links" className="mt-7 flex flex-wrap gap-3">
                {project.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    {...(isExternal(link.href)
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-[var(--color-text-primary)] ring-1 ring-white/12 transition-[colors,transform] duration-200 hover:bg-white/16 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-blue)]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
