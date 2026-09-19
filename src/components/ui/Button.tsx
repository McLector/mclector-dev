import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * `download` / `downloadReady` are the centre-stage CV control: the dimmed
 * placeholder (`--cv-*` tokens, its own disabled opacity) and the live look
 * (`--btn-*` tokens). They own their dimming and hover, so they skip the shared
 * `disabled:opacity-40` and lift — `cn` is a plain joiner, so a later class
 * cannot reliably override an earlier one.
 */
export type ButtonVariant = "primary" | "secondary" | "download" | "downloadReady";
/** `slim` is the compact pill used by the framed window's action row. */
export type ButtonSize = "regular" | "slim";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
export function buttonClasses(
  variant: ButtonVariant = "primary",
  { size = "regular", className }: { size?: ButtonSize; className?: string } = {},
): string {
  const download = variant === "download" || variant === "downloadReady";
  return cn(
    "inline-flex items-center justify-center rounded-full",
    // Fixed px sizes: the window is scaled as one unit, so viewport-relative
    // type/padding would fight the scale.
    size === "slim"
      ? download
        ? "gap-2 px-[22px] py-2.5 text-[12.5px] leading-none"
        : "px-[18px] py-2.5 text-[12.5px]"
      : "px-5 py-2.5 text-sm",
    "font-semibold disabled:cursor-not-allowed",
    variant !== "download" && "disabled:opacity-40",
    "transition-[transform,box-shadow,background-color] duration-200",
    variant !== "download" && "hover-fine:-translate-y-0.5 active:scale-[0.97]",
    // Themed: primary is the high-contrast text colour as a solid pill (near-white
    // on dark, near-black on light); secondary is a quiet glass pill. Both read
    // correctly in either theme.
    variant === "primary" &&
      "bg-[var(--color-text-primary)] text-[var(--color-surface)] shadow-[0_8px_26px_-12px_var(--color-text-primary)] hover:opacity-90 hover-fine:shadow-[0_12px_32px_-12px_var(--color-text-primary)]",
    variant === "secondary" &&
      "bg-[color-mix(in_oklab,var(--color-text-primary)_10%,transparent)] text-[var(--color-text-primary)] ring-1 ring-[var(--glass-border)] hover:bg-[color-mix(in_oklab,var(--color-text-primary)_16%,transparent)]",
    variant === "download" &&
      "bg-[var(--cv-bg)] text-[var(--cv-fg)] ring-1 ring-inset ring-[var(--glass-border)] disabled:opacity-[var(--cv-dis)]",
    variant === "downloadReady" &&
      "bg-[var(--btn-bg)] text-[var(--btn-ink)] shadow-[0_8px_26px_-12px_var(--color-text-primary)] hover:opacity-90",
    className,
  );
}

export function Button({
  variant = "primary",
  size = "regular",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, { size, className })} {...rest}>
      {children}
    </button>
  );
}
