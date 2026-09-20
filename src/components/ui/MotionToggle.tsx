import { useMotion } from "@/lib/useMotion";
import { ROUND_TOGGLE_CLASSES } from "./roundToggle";

/**
 * The Animations switch: an icon circle stacked under the day/night toggle (approved in the round-3b mockup).
 *
 * It governs AMBIENT motion only (see `src/lib/motion.ts`); hover and focus transitions are locked on in both
 * states. Because the default ignores the OS reduced-motion setting, this is the visitor's only way out of
 * ambient motion, so it is always visible and keyboard-operable.
 *
 * Accessibility: the accessible name is CONSTANT ("Animations") and the state is `aria-pressed`, so nothing is
 * announced twice. (`ThemeToggle` changes its label with its state and also sets aria-pressed; not copied.)
 * The tooltip carries the current state in words, and the glyph differs (a wave, and the same wave struck
 * through) so the state is never carried by colour alone.
 */
export function MotionToggle({ className }: { className?: string }) {
  const { on, toggle } = useMotion();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label="Animations"
      title={`Animations: ${on ? "on" : "off"}`}
      data-testid="motion-toggle"
      className={[ROUND_TOGGLE_CLASSES, className ?? ""].join(" ")}
    >
      {on ? <WaveIcon /> : <WaveOffIcon />}
    </button>
  );
}

function WaveIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12c2.2-6.5 4.4-6.5 6.6 0s4.4 6.5 6.6 0 4.4-6.5 6.6 0" />
    </svg>
  );
}

function WaveOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12c2.2-6.5 4.4-6.5 6.6 0s4.4 6.5 6.6 0 4.4-6.5 6.6 0" />
      <path d="M4 20 20 4" />
    </svg>
  );
}
