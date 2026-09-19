import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "@/lib/useTheme";

/**
 * The day/night switch. A single button that toggles the document theme; the
 * sun/moon crossfades and rotates on change. `aria-pressed` reflects "light is
 * on", and the label always names the destination state so a screen-reader
 * user knows what pressing it does.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isLight}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
      data-testid="theme-toggle"
      className={[
        "group relative grid size-10 place-items-center overflow-hidden rounded-full",
        // The window-panel surface (as in the approved mockup): at dusk --glass-bg is
        // now a near-white .9 that would read as a bright disc on the sky.
        "bg-[var(--panel)] text-[var(--color-text-secondary)] backdrop-blur-md",
        "ring-1 ring-[var(--panel-edge)] shadow-[var(--glass-shadow)]",
        "transition-[transform,color] duration-200 active:scale-[0.92]",
        "hover-fine:text-[var(--color-text-primary)]",
        "focus-visible:outline-2 focus-visible:outline-[var(--color-accent-blue)]",
        className ?? "",
      ].join(" ")}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inline-flex"
        >
          {isLight ? <SunIcon /> : <MoonIcon />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.1 5.1l1.7 1.7M17.2 17.2l1.7 1.7M18.9 5.1l-1.7 1.7M6.8 17.2l-1.7 1.7" />
      </g>
    </svg>
  );
}
