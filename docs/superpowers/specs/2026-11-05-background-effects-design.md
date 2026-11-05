# Background effects and white light theme: design

Date: 2026-11-05. Status: **approved**. Nothing in `src/` has been changed yet.

Approved mock-ups (open them in a browser):
- `docs/reference/2026-11-05-background-horizon-dust-mockup.html`: the dark-theme background, with the strength and glow-placement switches.
- `docs/reference/2026-11-05-background-white-theme-mockup.html`: the whole white light theme, full page.

## Intent

The owner finds the current background **too busy and generic**. Today it stacks about eight layers: a sky gradient, four breathing nebula clouds, two twinkling and drifting star fields, a dot grid, a vignette, and a canvas of drifting asteroids, falling binary rain and a random comet, plus pointer parallax. All of it competes with the bento cards and the hologram.

The replacement is a single quiet idea that suits the space-console identity (Sora and Space Mono, arc blue, the hologram projector): **a horizon glow along the bottom with two sparse depth layers of stars above it** (mock-up options A3 + A5). The light theme moves from steel blue to **white**.

## Goals
- The background supports the cards and the hologram and never pulls attention from them.
- It looks right as a **still frame**. The Animations toggle is off by default (`DEFAULT_MOTION = "off"` in `src/lib/motion.ts`), so most visitors only ever see the still frame.
- Both themes read as one design, with arc blue as the only saturated colour.
- Text contrast stays at or above today's enforced levels.

## Non-goals
- No change to the layout, the content, the hologram's geometry or the three-column bento.
- No new motion features and no new settings. The existing Animations toggle governs everything.

## Anti-goals (a failure even if it technically works)
- A background the owner would again call busy: any element that moves while Animations is on must be slow enough to be unnoticed on first look.
- A white theme where the cards dissolve into the page (flat white on white).
- Reading the OS `prefers-reduced-motion` setting. That is a standing owner decision (`docs/contracts.md`).

## Decisions

**Owner decisions**
1. Direction: quiet space, not the console grid or the blend. Mock-up A, then the A3 (horizon glow) and A5 (drifting dust) combination.
2. Light theme: the **whole white theme** (white page, white cards on a near-white window, hairline borders and soft shadows, ink text, arc blue `#1a86f5` as the only colour). Not the white-sky-only variant.
3. The effect on white is the **Faint ink** treatment: a pale blue horizon wash and grey-blue dust dots.

**My calls (the owner has not chosen yet; change any of these freely)**
4. Dark-theme strength: **Subtle**, because the brief is "not overwhelming".
5. Glow placement: **around the window** rather than only the bottom edge, because on desktop the scaled window covers most of the viewport and a bottom-edge glow would mostly sit behind it.
6. Pointer parallax on the stars is **dropped**. The mock-ups never included it and it adds a pointer listener for little gain.
7. The "Let's Connect" neon sign stays a dark navy plate in both themes, as it is today. It becomes the one dark object on the white page.

## Design

### Dark theme background
Layers, back to front, all inside the existing `.galaxy` backdrop:
1. Sky: the existing `--sky-top/mid/bottom` gradient, unchanged.
2. Two sparse star layers (`far` and `near`), tiled radial-gradient dots, masked with `linear-gradient(to bottom, black 20%, transparent 74%)` so they thin out toward the horizon. Opacity: far 0.7 × strength, near 1 × strength, strength 0.5 (Subtle).
3. Horizon glow: arc blue at 30% (Subtle) in `radial-gradient(80% 34% at 50% 98%)`, plus a second wash `radial-gradient(62% 52% at 50% 56%)` at 45% of that for the around-window placement. A 1px arc-blue horizon hairline sits at `bottom: 4%`.
4. Vignette: the existing one, kept.

Removed: the four nebula clouds (`.galaxy::before`), the canvas (data rain, asteroids, comet), the dot grid (`.starfield-grid`) and the CSS comet.

Motion (only when Animations is on): the glow breathes over **30s** (opacity 0.75 to 1), the far star layer drifts over **160s** and the near layer over **90s**, by at most -5% / -3%. The mock-up runs these faster so they can be seen. With Animations off, all of it is static.

### White light theme tokens
Replaces the steel `:root[data-theme="light"]` block in `src/styles/index.css`. Values are those in the white-theme mock-up:
- Page: `#fff`. Window: `oklch(0.985 0.004 250 / 0.9)` with an inset hairline `oklch(0.4 0.05 250 / 0.14)` and a soft long shadow.
- Cards: `#fff`, 1px hairline `oklch(0.4 0.05 250 / 0.14)`, shadow `0 8px 22px -14px oklch(0.3 0.06 250 / 0.3)`. Glass blur is not relied on.
- Tiles and chips: `oklch(0.97 0.008 250)` with the same hairline.
- Text: primary `oklch(0.21 0.04 262)`, secondary `oklch(0.34 0.04 262)`, muted `oklch(0.43 0.04 262)` (unchanged from steel).
- Accent: `--arc: #1a86f5`; green `#0f9a63` / ink `#0b6b46` (unchanged).
- Hologram bay: pale glass, `radial-gradient(60% 40% at 50% 34%, #fff, transparent 72%)` over `linear-gradient(180deg, oklch(0.985 0.008 250), oklch(0.93 0.025 250))`, with an `oklch(0.4 0.08 250 / 0.2)` edge. The hologram keeps its ink palette (`src/three/palette.ts`, the `light` entry).
- Effect on white: horizon wash `arc 30%` at `radial-gradient(90% 40% at 50% 108%)`, hairline at `bottom: 4%`, and grey-blue dust dots (`oklch(0.55 0.08 250)`, 2px, opacity 0.6, same mask as the dark stars).

## Constraints and ripple (found by reading the code)
- The page is a framed window scaled to fit (`.app-window`, 1200×770 design size). On desktop the sky shows mainly in the margins and, blurred, through the window panel.
- **The browser-chrome colour changes in two places that must agree:** the inline boot script in `index.html` (currently `#91b6d7`) and `THEME_COLOR` in `src/lib/theme.ts`. `e2e/boot.spec.ts` reads its expected value from `THEME_COLOR`, so it is the guard and needs no edit. The dark colour `#05060d` is untouched.
- **`src/lib/contrast.ts` must be re-derived.** Every `light:` pair is computed from the steel panel over the steel sky. On white the worst case changes (white card on the near-white window). Dark pairs depend on "dark glass over a bright magenta nebula stop"; with the nebula gone the worst case is safer, but the table still has to be redone by hand and the tests must pass.
- `--scrim` (the project overlay backdrop) is steel-tinted today; it needs a white-theme value.
- `src/components/ui/roundToggle.ts` uses `--panel` and `--panel-edge`; check the day/night and Animations toggles still read on white.
- The light hologram palette (`src/three/palette.ts`) was approved on a pale steel bay on 2026-11-05. It must be re-checked on the near-white bay with the real WebGL scene on a real GPU. The mock-up only approximates the hologram.
- **Visual baselines exist for win32 and linux** (`e2e/visual.spec.ts-snapshots/`). Both sets must be regenerated; the linux set needs linux (CI or WSL).
- `e2e/animations.spec.ts` asserts that a strip down the left edge changes while animations are on. With the glow and star drift, that strip must still change measurably, or the spec has to be rewritten against the new layers.
- `src/layout/GalaxyBackdrop.tsx` and `.test.tsx`, and `src/layout/galaxyCanvas.ts` and `.test.ts`, are rewritten or deleted along with the canvas.
- **`docs/contracts.md` line 99 is wrong:** it says ambient motion "runs by default for everyone", but `src/lib/motion.ts` defaults it off. Fix the doc as part of this work, and update the list of ambient motion there (it names rain, rocks and comet).

## Work split
**One branch, both pieces (owner decision, 2026-11-05, after the plan review).** The new background and the white light theme ship together. The steel-blue light theme is never tuned for the new background, and the contrast table and the visual baselines are re-derived once, against the final dark and white themes. Order inside the branch: tests first, then the dark and shared backdrop, then the white light theme, then contrast and baselines, then docs.

## Testing approach (tests first, per the owner's CLAUDE.md)
- Unit: backdrop renders only the new layers; none of the removed classes remain; with motion off, no animation loop and no pointer listener.
- Contrast: the rewritten `TOKEN_CONTRAST_PAIRS` must pass at the existing minimum ratios (7 for body text, 4.5 elsewhere), both themes.
- E2E: `animations.spec.ts` (still frame is stable with motion off, changes with motion on), `boot.spec.ts` (chrome colour), `visual.spec.ts` (regenerated baselines).
- Manual: both themes at desktop and phone widths, Animations on and off, and the real hologram on a real GPU.

## Left to the builder
- Exact CSS structure and class names for the new layers.
- Whether the stars stay CSS tiles or become a small generated pattern.
- The phone-width treatment of the horizon glow (the mock-up shows it as a fixed layer behind a scrolling column).

## Open for the owner
- Confirm or change my calls 4 to 7.
- Hover states and the project overlay in the white theme are not mocked up; they follow the tokens above unless you want to see them first.
