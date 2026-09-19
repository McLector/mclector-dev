/**
 * The selectable "worlds" for the hanging ID pass. Choosing one re-skins the
 * badge face, the 3D accent halo, the lanyard band and the nebula glow behind
 * it — the whole pass re-themes to the picked palette while staying an ID card.
 * Pure data + a resolver so the switcher and the 3D scene agree on colours.
 */
export type PassTheme = {
  id: string;
  /** Short name shown in the switcher. */
  label: string;
  /** Cool accent anchor (drives the glow/halo). */
  from: string;
  /** Warm accent anchor. */
  to: string;
};

export const PASS_THEMES: PassTheme[] = [
  { id: "nebula", label: "Nebula", from: "#5b8cff", to: "#b061ff" },
  { id: "aurora", label: "Aurora", from: "#2fe6c0", to: "#3d8bff" },
  { id: "solar", label: "Solar", from: "#ffb14d", to: "#ff5da2" },
  { id: "cosmos", label: "Cosmos", from: "#8b5cf6", to: "#22d3ee" },
];

export const DEFAULT_PASS_THEME_ID = "nebula";

export function resolvePassTheme(id: string | undefined): PassTheme {
  return (
    PASS_THEMES.find((theme) => theme.id === id) ??
    PASS_THEMES.find((theme) => theme.id === DEFAULT_PASS_THEME_ID) ??
    PASS_THEMES[0]
  );
}
