import { cn } from "@/lib/cn";

export function Chip({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-white/8 px-3 py-1",
        "text-xs font-medium text-[var(--color-text-secondary)] ring-1 ring-white/10",
        className,
      )}
    >
      {children}
    </span>
  );
}
