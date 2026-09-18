import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

/**
 * The shared class string for both variants. Exported so a consumer that
 * genuinely needs a non-<button> element (e.g. a real `<a href>` for an
 * external navigation, which `<button>` cannot semantically be) can match
 * the same visual style without hand-duplicating the class list — see
 * src/features/actions/ActionsRow.tsx for that case.
 */
// eslint-disable-next-line react-refresh/only-export-components -- intentional shared helper, see docstring above
export function buttonClasses(variant: ButtonVariant = "primary", className?: string): string {
  return cn(
    "inline-flex items-center justify-center rounded-full px-5 py-2.5",
    "text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40",
    "transition-[transform,box-shadow,background-color] duration-200 hover-fine:-translate-y-0.5 active:scale-[0.97]",
    variant === "primary" &&
      "bg-white text-neutral-950 shadow-[0_8px_26px_-10px_rgb(255_255_255/0.45)] hover:bg-white/90 hover-fine:shadow-[0_12px_32px_-10px_rgb(255_255_255/0.6)]",
    variant === "secondary" &&
      "bg-white/10 text-[var(--color-text-primary)] ring-1 ring-white/15 hover:bg-white/15 hover:ring-white/25",
    className,
  );
}

export function Button({ variant = "primary", className, children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, className)} {...rest}>
      {children}
    </button>
  );
}
