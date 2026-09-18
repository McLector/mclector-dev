import type { Project } from "@/content/types";

/**
 * PLACEHOLDER — owned by Stream E. Frozen contract:
 *   <ProjectOverlay projects={Project[]} />
 * Mounted once in App.tsx, always in the tree. Reads the current slug from
 * src/lib/useHashRoute.ts; renders nothing when no project is open. Also
 * owns src/lib/useFocusTrap.ts. Hash format `#/project/:id` is frozen —
 * Stream C's badge caption and any future cross-link may target it.
 */
export function ProjectOverlay({ projects: _projects }: { projects: Project[] }) {
  return null;
}
