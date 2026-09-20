import { motion } from "motion/react";
import type { Project } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useHashRoute } from "@/lib/useHashRoute";
import { projectLayoutId, statusLabel, thumbnailStyle } from "./thumbnail";

/**
 * The "work" card: a launcher, not a detail view. A row's only job is to
 * write `#/project/:id`; <ProjectOverlay> (mounted separately in App.tsx)
 * is what reacts to that. Going through the hash rather than a callback is
 * what makes every project detail a shareable, back-button-able URL.
 *
 * Only `featured` projects are listed — the rest stay overlay-reachable by
 * direct link (see src/content/projects.ts).
 */
export function ProjectsCard({ projects }: { projects: Project[] }) {
  const { openProject } = useHashRoute();
  const featured = projects.filter((project) => project.featured);

  return (
    <BentoCard area="work" as="section" grow>
      <div className="flex h-full flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow as="h2">Latest projects</Eyebrow>
          {featured.length > 0 && (
            <span className="count font-mono">{featured.length} featured</span>
          )}
        </div>

        {featured.length === 0 ? (
          <p
            data-testid="projects-empty"
            className="rounded-[var(--radius-card)] border border-dashed border-[var(--glass-border)] p-4 text-xs text-[var(--color-text-muted)]"
          >
            Projects are being written up — check back soon.
          </p>
        ) : (
          <ul
            data-testid="projects-list"
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
          >
            {featured.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  data-testid={`project-row-${project.id}`}
                  data-project-row={project.id}
                  aria-haspopup="dialog"
                  onClick={() => openProject(project.id)}
                  className="group flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-[color,background-color,box-shadow,transform] duration-200 hover:bg-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)] focus-visible:bg-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-blue)]"
                >
                  <motion.span
                    layoutId={projectLayoutId(project.id)}
                    data-layout-id={projectLayoutId(project.id)}
                    data-testid={`project-thumb-${project.id}`}
                    aria-hidden="true"
                    style={thumbnailStyle(project.thumbnail)}
                    className="size-9 shrink-0 rounded-[9px] ring-1 ring-[var(--glass-border)] transition-shadow group-hover:ring-[var(--glass-highlight)]"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                      {project.title}
                    </span>
                    <span className="truncate text-[10px] text-[var(--color-text-muted)]">
                      {project.subtitle}
                    </span>
                  </span>
                  <span className="shrink-0 text-[8px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                    {statusLabel(project.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BentoCard>
  );
}
