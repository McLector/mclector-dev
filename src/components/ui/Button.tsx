import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  children: ReactNode;
};

export function Button({ variant = "primary", className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-2.5",
        "text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" &&
          "bg-white text-neutral-950 hover:bg-white/90",
        variant === "secondary" &&
          "bg-white/10 text-[var(--color-text-primary)] ring-1 ring-white/15 hover:bg-white/15",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
