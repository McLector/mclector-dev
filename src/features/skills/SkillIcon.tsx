import type { Skill } from "@/content/types";
import { getSkillIcon } from "./skillIcons";

/** Two-letter fallback for a skill with no brand mark (e.g. "RN", "ZU"). */
function fallbackInitials(label: string): string {
  const caps = label.replace(/[^A-Za-z]/g, "").match(/[A-Z]/g);
  if (caps && caps.length >= 2) return caps.slice(0, 2).join("");
  const letters = label.replace(/[^A-Za-z]/g, "");
  return (letters.slice(0, 2) || "•").toUpperCase();
}

/**
 * The brand logo for a skill, drawn in `currentColor` so it inherits the tile's
 * theme-aware colour (and brightens on hover via the parent). Each mark brings
 * its own viewBox, and the hand-drawn stand-ins are stroked rather than filled.
 * Skills with no registered mark render a lettered glyph instead of a broken icon.
 */
export function SkillIcon({ skill, className }: { skill: Skill; className?: string }) {
  const icon = getSkillIcon(skill.icon);

  if (!icon) {
    return (
      <span
        aria-hidden="true"
        className={`grid place-items-center font-[family-name:var(--font-mono)] text-[0.7rem] font-bold ${className ?? ""}`}
      >
        {fallbackInitials(skill.label)}
      </span>
    );
  }

  return (
    <svg
      viewBox={icon.viewBox}
      role="img"
      aria-hidden="true"
      fill={icon.stroke ? "none" : "currentColor"}
      className={className}
    >
      {icon.stroke ? (
        <path
          d={icon.path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path d={icon.path} fillRule={icon.fillRule} />
      )}
    </svg>
  );
}
