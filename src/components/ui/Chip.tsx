import { cn } from "@/lib/cn";

export function Chip({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)] px-3 py-1",
        "text-xs font-medium text-[var(--color-text-secondary)] ring-1 ring-[var(--glass-border)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
