import { useEffect, useState } from "react";

/**
 * `true` while the tab is foregrounded. Combined with `useInView` this is the
 * other half of the frameloop gate: a backgrounded tab must not keep stepping
 * a physics world.
 */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState !== "hidden",
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}
