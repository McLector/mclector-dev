import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_MOTION, getMotion, nextMotion, setMotion, subscribeMotion, type Motion } from "./motion";

/**
 * The live Animations setting plus a toggle. Components re-render the moment it changes, wherever it was
 * changed from, with no reload. The store itself is `motion.ts`; this is only the React binding.
 */
export function useMotion(): {
  motion: Motion;
  on: boolean;
  toggle: () => void;
  setMotion: (motion: Motion) => void;
} {
  const motion = useSyncExternalStore(subscribeMotion, () => getMotion(), () => DEFAULT_MOTION);
  const toggle = useCallback(() => setMotion(nextMotion(getMotion())), []);
  return { motion, on: motion === "on", toggle, setMotion };
}
