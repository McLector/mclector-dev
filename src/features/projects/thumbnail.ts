import type { CSSProperties } from "react";
import type { Project } from "@/content/types";

/**
 * `ImageRef.src` is undefined by design in v1 (src/content/types.ts), so a
 * project thumbnail is painted from its `placeholder` gradient descriptor.
 * Rendering an <img> with no src would give us a broken-image glyph; this
 * gives us a deliberate, deterministic mark instead. Same technique the
 * location card uses for its map texture.
 */
export function thumbnailStyle(thumbnail: Project["thumbnail"]): CSSProperties {
  const { from, to } = thumbnail.placeholder;

  return {
    backgroundColor: to,
    backgroundImage: [
      `radial-gradient(120% 120% at 22% 18%, ${from} 0%, transparent 70%)`,
      `linear-gradient(145deg, ${from} 0%, ${to} 100%)`,
    ].join(", "),
  };
}

/**
 * The shared-layout id linking a row's thumbnail in <ProjectsCard> to the
 * same project's thumbnail in <ProjectOverlay>, so `motion` morphs one into
 * the other. Both ends must agree, hence one function.
 */
export function projectLayoutId(id: string): string {
  return `project-${id}`;
}

const STATUS_LABELS: Record<Project["status"], string> = {
  live: "Live",
  "in-progress": "In progress",
  complete: "Complete",
  planning: "Planning",
};

/** Status as words — never colour alone (WCAG 1.4.1). */
export function statusLabel(status: Project["status"]): string {
  return STATUS_LABELS[status];
}
