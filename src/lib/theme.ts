/**
 * Theme model for the day/night toggle. Pure decision logic lives here and is
 * unit-tested directly; the DOM/`localStorage`/`matchMedia` side effects live
 * in `useTheme` (see useTheme.ts), which is exercised in the browser.
 */

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

/**
 * What a first-time visitor sees: the deep-space night sky, whatever their OS is set to.
 * Only an explicit choice (the day/night toggle) changes it.
 */
export const DEFAULT_THEME: Theme = "dark";

/** localStorage key the visitor's explicit choice is persisted under. */
export const THEME_STORAGE_KEY = "mclector-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/**
 * Resolve the theme to apply on first paint:
 *   1. a valid, previously stored choice wins (so the toggle persists across visits);
 *   2. otherwise {@link DEFAULT_THEME} — dark.
 *
 * The visitor's OS `prefers-color-scheme` is deliberately NOT an input: the site is designed as a
 * night sky, and a light-mode OS should not turn a first visit into the daytime theme.
 * Keep the inline anti-flash script in index.html in agreement with this rule.
 */
export function resolveInitialTheme(stored: string | null | undefined): Theme {
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

/** The other theme — what a toggle switches to. */
export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/**
 * The browser chrome colour to advertise per theme (drives `theme-color`). Light is the steel sky's mid stop
 * (`--sky-mid`, oklch(0.76 0.062 246)); keep it in step with src/styles/index.css.
 */
export const THEME_COLOR: Record<Theme, string> = {
  dark: "#05060d",
  light: "#91b6d7",
};
