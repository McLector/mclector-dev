/**
 * Theme model for the day/night toggle. Pure decision logic lives here and is
 * unit-tested directly; the DOM/`localStorage`/`matchMedia` side effects live
 * in `useTheme` (see useTheme.ts), which is exercised in the browser.
 */

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

/** The deep-space default when nothing else is known. */
export const DEFAULT_THEME: Theme = "dark";

/** localStorage key the visitor's explicit choice is persisted under. */
export const THEME_STORAGE_KEY = "mclector-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/**
 * Resolve the theme to apply on first paint:
 *   1. a valid, previously stored choice wins;
 *   2. otherwise the OS `prefers-color-scheme`;
 *   3. otherwise {@link DEFAULT_THEME}.
 */
export function resolveInitialTheme(
  stored: string | null | undefined,
  systemPrefersDark: boolean,
): Theme {
  if (isTheme(stored)) return stored;
  return systemPrefersDark ? "dark" : "light";
}

/** The other theme — what a toggle switches to. */
export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/** The browser chrome colour to advertise per theme (drives `theme-color`). */
export const THEME_COLOR: Record<Theme, string> = {
  dark: "#05060d",
  light: "#cdbfe8",
};
