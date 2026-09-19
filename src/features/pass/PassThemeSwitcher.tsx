import type { PassTheme } from "./passThemes";

/**
 * The pass-theme switcher: a compact row of gradient swatches under the badge.
 * Picking one re-skins the whole ID pass (face, halo, band and glow). It is a
 * single-select control, so it's a radiogroup of toggle buttons with
 * `aria-checked` reflecting the active world.
 */
export function PassThemeSwitcher({
  themes,
  value,
  onChange,
}: {
  themes: PassTheme[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Pass theme"
      data-testid="pass-theme-switcher"
      className="flex flex-wrap items-center justify-center gap-1.5"
    >
      {themes.map((theme) => {
        const active = theme.id === value;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={theme.label}
            title={theme.label}
            onClick={() => onChange(theme.id)}
            className={[
              "group flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5",
              "backdrop-blur-md transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.95]",
              active
                ? "bg-[color-mix(in_oklab,var(--color-text-primary)_12%,transparent)] ring-1 ring-[var(--glass-highlight)]"
                : "bg-[color-mix(in_oklab,var(--color-text-primary)_5%,transparent)] ring-1 ring-[var(--glass-border)] hover-fine:bg-[color-mix(in_oklab,var(--color-text-primary)_9%,transparent)]",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className="size-3.5 rounded-full ring-1 ring-black/20"
              style={{
                backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                boxShadow: active ? `0 0 10px -1px ${theme.from}` : undefined,
              }}
            />
            <span
              className={[
                "font-[family-name:var(--font-mono)] text-[0.62rem] tracking-[0.08em] uppercase transition-colors",
                active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]",
              ].join(" ")}
            >
              {theme.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
