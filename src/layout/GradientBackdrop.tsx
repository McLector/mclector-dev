/**
 * The animated gradient backdrop is CSS, not WebGL — cheaper, GPU-composited,
 * trivially frozen under prefers-reduced-motion (see src/styles/index.css),
 * and it matches the flat gradient in the reference. Fixed behind everything.
 */
export function GradientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 bg-neutral-950"
    >
      <div className="absolute inset-0 animate-[bento-gradient-pan_18s_ease-in-out_infinite] bg-[length:200%_200%] bg-[linear-gradient(120deg,var(--color-accent-blue),var(--color-accent-purple),var(--color-accent-magenta),var(--color-accent-orange))] opacity-70" />
      <div className="absolute inset-0 bg-neutral-950/40" />
    </div>
  );
}
