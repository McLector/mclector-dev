import type { Project } from "@/content/types";
import { BentoCard } from "@/components/ui/BentoCard";

/**
 * PLACEHOLDER — owned by Stream E. Frozen contract: <ProjectsCard projects={Project[]} />
 * Renders only `featured` projects as rows; clicking a row opens
 * <ProjectOverlay> (also Stream E) via the shared #/project/:id hash route
 * (src/lib/useHashRoute.ts). Rendered inside the "work" grid area.
 */
export function ProjectsCard({ projects }: { projects: Project[] }) {
  const featured = projects.filter((p) => p.featured);
  return (
    <BentoCard area="work">
      <p className="text-xs text-[var(--color-text-muted)]">
        Stream E — {featured.length} featured projects
      </p>
    </BentoCard>
  );
}
