import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, isTheme, type Theme } from "./theme";

/**
 * The live theme, read from `<html data-theme>`: the same source the CSS tokens key off.
 *
 * `useTheme` keeps its own state per caller, so it cannot tell code in a different React root that the toggle
 * was pressed. The 3D scene is such code (it lives inside react-three-fiber's own root), so it reads the
 * attribute instead and re-renders when it changes. An absent or unrecognised attribute means dark.
 */
function read(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : DEFAULT_THEME;
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useDocumentTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_THEME);
}
