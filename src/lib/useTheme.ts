import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  THEME_COLOR,
  THEME_STORAGE_KEY,
  isTheme,
  nextTheme,
  resolveInitialTheme,
  type Theme,
} from "./theme";

function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Apply a theme to the document: the `data-theme` attribute the CSS tokens key
 * off, the `color-scheme` property (native form controls / scrollbars), and the
 * `theme-color` meta (mobile browser chrome). Kept in one place so the inline
 * anti-flash script in index.html and this hook stay in agreement.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
}

/**
 * The live theme, plus a toggle. Initialises from whatever the inline script
 * already put on `<html data-theme>` (so React never disagrees with first
 * paint), and persists an explicit choice to `localStorage`. Every storage
 * access is wrapped — a private window or blocked site-data must not throw.
 */
export function useTheme(): {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
} {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== "undefined" && isTheme(document.documentElement.dataset.theme)) {
      return document.documentElement.dataset.theme as Theme;
    }
    if (typeof window === "undefined") return DEFAULT_THEME;
    return resolveInitialTheme(readStored());
  });

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Persisting is a convenience, not a requirement.
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((current) => {
      const next = nextTheme(current);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Reflect the current theme onto the document whenever it changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // No OS-following: dark is the default, so the OS switching scheme mid-visit must not flip a
  // visitor who has made no choice (only the toggle changes the theme).

  return { theme, toggle, setTheme };
}
