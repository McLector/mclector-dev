# Quiet Background and White Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the busy galaxy backdrop with one quiet horizon glow and two sparse star layers, and replace the steel-blue light theme with a white one, on a single branch.

**Architecture:** `GalaxyBackdrop` becomes static markup (four `aria-hidden` divs, no hooks, no canvas, no listeners). Look and motion live in `src/styles/index.css`; ambient motion is still governed only by the existing `html[data-motion="off"]` rule. The white theme is a rewrite of the `:root[data-theme="light"]` token block plus a sweep of the components that assumed steel.

**Tech Stack:** React 19, Tailwind v4 + hand-written CSS in `src/styles/index.css`, Vitest + Testing Library, Playwright (`e2e/`, three projects: `chromium`, `mobile-chrome`, `webgl`).

**Spec:** `docs/superpowers/specs/2026-11-05-background-effects-design.md`. Approved mock-ups: `docs/reference/2026-11-05-background-horizon-dust-mockup.html` (dark: Subtle, Around window, Still) and `docs/reference/2026-11-05-background-white-theme-mockup.html` (white: Faint ink, Still). The mock-ups sped the motion up and drew the hologram and skill logos as stand-ins; the spec's timings and the real components win.

## Global Constraints

- Work on branch `feat/quiet-background`, never on `main`. Nothing is pushed, and no PR is opened, without the owner's go.
- Commits: Conventional Commits, `type(scope): imperative summary`, body explains why. **No `Co-Authored-By` trailer and no AI attribution** (the owner's CLAUDE.md overrides any default).
- Tests are written before the code they test, and each new test is seen failing first.
- The OS `prefers-reduced-motion` setting is never read; no `@media (hover:…)` or `(pointer:…)` (`docs/contracts.md`, guarded by `src/lib/hoverAndMotionPolicy.test.ts`).
- `DEFAULT_MOTION` stays `"off"`: the still frame is what most visitors see and must look right alone.
- Real-motion timings: glow breathes **30s**, far stars drift **160s**, near stars drift **90s**, ending at `translate3d(-5%, -3%, 0)`.
- Dark theme: `--horizon-glow: 0.3`, `--star-strength: 0.5`, glow placed around the window. Light theme: white values from the spec.
- The repo is **public**. Never commit `.superpowers/`, memory files, `.env` values or personal notes.
- Long runs (`npm run build`, `npm run test:e2e`, `npm run dev`) go detached to a log file and are polled; in the foreground they die here. Missing `node_modules` means `npm ci` first. Use PowerShell for `gh`.
- Real command output is shown for every check; nothing is called passing on the strength of a diff.

## Review Focus

1. Phone width (390px): fixed star layers use `inset: -10%`; the page must not gain a horizontal scrollbar. (Task 2, 7)
2. Animations switched off mid-session: glow and stars stop with no reload, and resume when switched back on. (Task 2, 7)
3. Both themes define the glow and star tokens, or one theme silently loses its glow. (Task 4)
4. Short and tall viewports (1440×600, 1440×1200): the horizon hairline stays 4% above the bottom edge, inside the viewport. (Task 2, 7)
5. White cards on a near-white window: cards must still read as separate objects, and text must keep its contrast over the glow. (Tasks 5, 8, and the owner's look in Task 10)
6. Components that assumed steel (`ProjectOverlay`, `BadgeFallback`, `brandAccent`, `Chip`, `Pill`, `Button`, `roundToggle`) must still be legible on white, including the overlay scrim. (Task 5)

## File Structure

- `src/layout/GalaxyBackdrop.tsx` and `.test.tsx`: rewritten. Keep the component name and the `.galaxy`, `.stars` class names (`e2e/hover.spec.ts` and `e2e/animations.spec.ts` select `.stars`).
- `src/layout/galaxyCanvas.ts` and `.test.ts`: deleted.
- `src/styles/index.css`: backdrop rules, keyframes, theme tokens replaced; comments naming removed layers rewritten.
- `src/styles/backdrop.test.ts`: new; asserts on the comment-stripped CSS text.
- `index.html` (boot script) and `src/lib/theme.ts` (`THEME_COLOR`): the light chrome colour. `e2e/boot.spec.ts` already reads the expected value from `THEME_COLOR`, so it needs no edit.
- `src/lib/contrast.ts` and `contrast.test.ts`: worst-case constants and light pairs re-derived.
- `src/lib/motion.ts` and `motion.test.ts`: `motionOn` removed (dead after the rewrite; `subscribeMotion` stays, `useMotion.ts` uses it).
- `e2e/animations.spec.ts`, `e2e/hover.spec.ts`, `e2e/visual.spec.ts`; `e2e/visual.spec.ts-snapshots/*`.
- `docs/contracts.md` lines 99–101; comments in `BentoCard.tsx`, `PassCard.tsx` and any other hit of the stale-word grep.

---

### Task 1: Branch and docs

- [ ] **Step 1: Create the branch.** `git switch -c feat/quiet-background` (untracked docs carry over).
- [ ] **Step 2: Confirm visibility.** In PowerShell: `gh repo view --json visibility`. Expected: `PUBLIC` (so assume public). The spec, this plan and the two mock-ups contain the owner's name and email, which are already in `src/content/profile.ts`; no secrets.
- [ ] **Step 3: Commit the docs.** `git add docs/superpowers docs/reference/2026-11-05-background-*.html && git commit -m "docs(background): add the design spec, plan and approved mock-ups"`; body: the background is too busy and the light theme moves to white. Check `git status` shows no `.superpowers/`.

### Task 2: Failing e2e assertions (red first)

**Files:** Modify `e2e/animations.spec.ts`; `e2e/hover.spec.ts` (comment on line 125: "5.5s twinkle, 140s drift" becomes "160s drift").

**Interfaces:** Consumes `animationsOnState` from `e2e/support/motion`; the class names from Task 3.

- [ ] **Step 1: Rewrite "off freezes the ambient layer; on brings it back"** (remove `galaxyStrip`'s use while on; the new motion is too slow for a 700ms pixel diff):
  - ON: `.stars` `animation-duration` longest `> 100`; `.stars-near` `> 60`; `getComputedStyle(document.querySelector(".galaxy"), "::before").animationDuration` is `"30s"`.
  - Click the toggle OFF, no reload: all three `< 0.01`; two screenshots of a 110×700 left strip 700ms apart are byte-equal.
  - Click ON again, no reload: the ON values return.
- [ ] **Step 2: Add `the horizon hairline stays 4% above the bottom edge`** (desktop project): at 1440×600 and 1440×1200, `.horizon-line`'s `y + height` is within 2px of `0.96 * viewportHeight` and inside the viewport.
- [ ] **Step 3: Add `the fixed layers do not create a horizontal scrollbar`**: `document.documentElement.scrollWidth <= window.innerWidth`, at 390×844 on both projects.
- [ ] **Step 4: See them fail.** Detached: `npx playwright test e2e/animations.spec.ts --project=chromium --project=mobile-chrome` to a log. Expected: the duration and hairline tests FAIL on the current code (`.stars-near` and `.horizon-line` do not exist; `.galaxy::before` runs 16s). The scrollbar test may already pass; that is fine, it is a regression guard.
- [ ] **Step 5: Commit.** `git commit -m "test(motion): assert the quiet backdrop through computed styles"`.

### Task 3: Static backdrop component

**Files:** Modify `src/layout/GalaxyBackdrop.tsx`, `src/layout/GalaxyBackdrop.test.tsx`. Delete `src/layout/galaxyCanvas.ts`, `src/layout/galaxyCanvas.test.ts`.

**Interfaces:** Produces `export function GalaxyBackdrop(): JSX.Element`: a fragment of four `<div aria-hidden="true">`, classes in order `galaxy`, `stars`, `stars-near`, `horizon-line`. No props, hooks or effects. `App.tsx` needs no change.

- [ ] **Step 1: Rewrite the unit test** (drop the canvas stub, frame queue, pointer helper). Tests:
  - `renders the sky, both star layers and the horizon hairline, hidden from assistive tech`: each of the four selectors exists with `aria-hidden="true"`.
  - `renders none of the removed layers`: `canvas`, `.galaxy-parallax`, `.starfield-grid`, `.comet` are `null`.
  - `attaches no pointer or resize listener and never schedules a frame`: spy `window.addEventListener` and `window.requestAnimationFrame`; after `render`, `addEventListener` was not called with `"pointermove"` or `"resize"` and `requestAnimationFrame` was not called at all, and the same after `act(() => setMotion("on"))` (import from `@/lib/motion`; clear `data-motion` and `localStorage` in `beforeEach`/`afterEach` as the old test does).
- [ ] **Step 2: See it fail.** `npx vitest run src/layout/GalaxyBackdrop.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Rewrite `GalaxyBackdrop.tsx`** to the interface; a short doc comment says the look lives in `index.css` and motion is governed by the Animations toggle through `html[data-motion]`. Delete the two `galaxyCanvas` files.
- [ ] **Step 4: Run.** `npx vitest run src/layout` then `npm run typecheck`. Expected: PASS, no type errors.
- [ ] **Step 5: Commit.** `git commit -m "refactor(backdrop): replace the canvas galaxy with static layers"`.

### Task 4: Backdrop CSS and tokens (both themes)

**Files:** Modify `src/styles/index.css`. Create `src/styles/backdrop.test.ts`.

**Interfaces:** Consumes the Task 3 class names and `--sky-*`, `--star-color`, `--arc`. Produces tokens `--horizon-glow` and `--star-strength` in `:root` and in `:root[data-theme="light"]`; keyframes `horizon-breathe` and `star-drift`.

- [ ] **Step 1: Write `backdrop.test.ts`.** Load the CSS the way `src/lib/hoverAndMotionPolicy.test.ts` does and strip comments first. Tests:
  - `has no trace of the removed layers`: none of `.comet`, `comet-streak`, `.starfield-grid`, `.galaxy-canvas`, `.galaxy-parallax`, `nebula-breathe`, `star-twinkle`, `--nebula-strength`, `--neb-`, `--grid-color`, `--rain`, `--star-opacity`.
  - `defines the glow and star tokens in both themes`: `--horizon-glow` and `--star-strength` appear in the base `:root` block and in the `:root[data-theme="light"]` block.
  - `uses the approved motion timings`: `.galaxy::before` animates `horizon-breathe 30s`, `.stars` `star-drift 160s`, `.stars-near` `star-drift 90s`; `@keyframes star-drift` ends at `translate3d(-5%, -3%, 0)`.
  - `fades both star layers toward the horizon`: both carry `mask-image: linear-gradient(to bottom, black 20%, transparent 74%)` (and the `-webkit-` twin).
  - `pins the horizon hairline`: `.horizon-line` is `position: fixed`, `bottom: 4%`, `height: 1px`.
  - `the motion-off rule no longer special-cases a comet`.
- [ ] **Step 2: See it fail.** `npx vitest run src/styles/backdrop.test.ts`. Expected: FAIL on all.
- [ ] **Step 3: Replace the backdrop CSS.** Decisions (the implementer writes the rules):
  - Tokens: remove `--star-opacity`, `--nebula-strength`, `--grid-color`, `--rain`, `--neb-a..d` from both blocks. Dark: `--horizon-glow: 0.3`, `--star-strength: 0.5`, `--star-color` unchanged. Light: `--horizon-glow: 0.3`, `--star-strength: 0.9`, `--star-color: oklch(0.55 0.08 250)`, sky stops `--sky-top: #fff`, `--sky-mid: #fff`, `--sky-bottom: oklch(0.975 0.008 250)`.
  - `.galaxy`: z-index -10; background is the first radial plus the linear gradient it has today (drop the second radial).
  - `.galaxy::before` (glow): two arc-blue radials, `radial-gradient(80% 34% at 50% 98%)` at `--horizon-glow` and `radial-gradient(62% 52% at 50% 56%)` at 45% of it, via `color-mix(in oklab, var(--arc) calc(var(--horizon-glow) * 100%), transparent)`; animation `horizon-breathe 30s ease-in-out infinite`; keyframes opacity `0.75` to `1`; base opacity `1`, so the still frame equals the peak.
  - `.galaxy::after` (vignette): dark `radial-gradient(130% 120% at 50% 40%, transparent 50%, oklch(0.04 0.02 275 / 0.5) 100%)`; light has **no vignette** (the approved white mock-up has none).
  - `.stars` (far) and `.stars-near`: `position: fixed; inset: -10%; z-index: -9; pointer-events: none`. Far: the eight 1px dots from the mock-up, `background-size: 50% 50%`, opacity `calc(var(--star-strength) * 0.7)`, `star-drift 160s linear infinite alternate`. Near: the four 1.5–1.8px dots, `background-size: 80% 80%`, opacity `var(--star-strength)`, `star-drift 90s linear infinite alternate`. Dots use `var(--star-color)`.
  - `.horizon-line`: `position: fixed; left: 0; right: 0; bottom: 4%; height: 1px; z-index: -9; pointer-events: none`, `linear-gradient(90deg, transparent, color-mix(in oklab, var(--arc) 55%, transparent), transparent)`.
  - Delete the `nebula-breathe`, `star-twinkle-a/b`, `comet-streak` keyframes, `.comet`, `.starfield-grid`, `.galaxy-parallax`, `.galaxy-canvas`, and the `.comet` line in the `data-motion="off"` block. Rewrite every comment in `index.css` that names a removed layer (currently lines 29, 107, 116, 130, 512 and the block comments above the deleted rules).
- [ ] **Step 4: Run.** `npx vitest run src/styles src/lib/hoverAndMotionPolicy.test.ts`. Expected: PASS.
- [ ] **Step 5: Gate.** `npm run typecheck && npm run lint && npm test`. Expected: exit 0 (contrast tests still pass at this point; they are re-derived in Task 8).
- [ ] **Step 6: Commit.** `git commit -m "feat(backdrop): quiet horizon glow and two sparse star layers"`; body: why, and that the still frame is the default look.

### Task 5: White light theme tokens and component sweep

**Files:** Modify the `:root[data-theme="light"]` block in `src/styles/index.css`; then each file the sweep finds.

**Interfaces:** Produces the white theme's token values (below). Consumes the existing token names, which do not change.

- [ ] **Step 1: Extend `backdrop.test.ts`** with `the light theme is white, not steel`: in the comment-stripped light block, `--panel` is `oklch(0.985 0.004 250 / 0.9)`, `--glass-bg` is `#fff`, `--glass-border` is `oklch(0.4 0.05 250 / 0.14)`, `--tile-bg` is `oklch(0.97 0.008 250)`, and the string `oklch(0.42 0.1 250 / 0.338)` (the old steel panel) is gone. See it fail.
- [ ] **Step 2: Rewrite the light block** (values from the approved mock-up). Window: `--panel: oklch(0.985 0.004 250 / 0.9)`, `--panel-edge: oklch(0.4 0.05 250 / 0.12)`, `--window-shadow: 0 40px 90px -34px oklch(0.3 0.06 250 / 0.3)`. Cards: `--glass-bg: #fff`, `--glass-border: oklch(0.4 0.05 250 / 0.14)`, `--glass-highlight: rgba(255, 255, 255, 0)`, `--glass-shadow: 0 8px 22px -14px oklch(0.3 0.06 250 / 0.3)`, `--card-accent: 0` (the approved mock-up has no lit top edge). Tiles: `--tile-bg: oklch(0.97 0.008 250)`, `--tile-ring: oklch(0.4 0.05 250 / 0.14)`. Stage: `--stage-bg: radial-gradient(60% 45% at 50% 38%, #fff, transparent 74%), linear-gradient(180deg, oklch(0.985 0.008 250), oklch(0.93 0.025 250))`, `--stage-edge: oklch(0.4 0.08 250 / 0.2)`, `--stage-caption: oklch(0.28 0.05 262)`. Text, `--arc: #1a86f5`, green and button tokens stay as they are. `--scrim` becomes a neutral ink tint, `oklch(0.25 0.03 262 / 0.4)` (the old steel tint would read as a blue haze on white). Update `--color-surface` and `--color-surface-raised` to white-family values. The "Download CV" ready pill is an ink pill as in the mock-up; adjust `--cv-*` / `--btn-*` only if it does not read that way.
- [ ] **Step 3: See the test pass.** `npx vitest run src/styles`.
- [ ] **Step 4: Sweep the steel assumptions.** `grep` for `light:`, `data-theme="light"`, `--scrim`, `--glass-`, `--tile-`, `--stage-` in `src` (about 82 hits in 20 files). Open the running site (dev server, detached) in the light theme and fix each component that reads wrong: at least `ProjectOverlay.tsx`, `BadgeFallback.tsx`, `skills/brandAccent.ts`, `Chip.tsx`, `Pill.tsx`, `Button.tsx`, `roundToggle.ts` (uses `--panel` and `--panel-edge`), `LocationCard.tsx` (its `light:` opacities). Each fix keeps its existing unit test green; where a component's unit test pins a steel value, update the test first.
- [ ] **Step 5: Run.** `npm run typecheck && npm run lint && npm test`. Expected: exit 0, except `contrast.test.ts` pairs that Task 8 re-derives (if any fail here, note which and carry them to Task 8; do not edit minimum ratios).
- [ ] **Step 6: Commit.** `git commit -m "feat(theme): move the light theme from steel blue to white"`; body: why, and what changed for cards (hairlines and soft shadows instead of glass).

### Task 6: Browser chrome colour

**Files:** Modify `src/lib/theme.ts` (`THEME_COLOR.light`), `index.html` (the inline boot script, line 40).

- [ ] **Step 1: Change `THEME_COLOR.light` to `"#ffffff"` first.** `e2e/boot.spec.ts` reads its expectation from `THEME_COLOR`, so it now fails against the stale `#91b6d7` in `index.html`. Run `npx playwright test e2e/boot.spec.ts --project=chromium`. Expected: the light-theme-color test FAILS.
- [ ] **Step 2: Update the inline script** in `index.html` to `"#ffffff"` and the comment above `THEME_COLOR` (it cites the steel sky's mid stop).
- [ ] **Step 3: Run it again.** Expected: PASS. Also `npx vitest run src/lib/theme` if a unit test pins the old value.
- [ ] **Step 4: Commit.** `git commit -m "fix(theme): advertise a white browser chrome for the light theme"`.

### Task 7: E2E green, hologram on white

- [ ] **Step 1: Run the Task 2 tests detached.** `npx playwright test e2e/animations.spec.ts e2e/hover.spec.ts --project=chromium --project=mobile-chrome` to a log. Expected: PASS (tests skipped for a project appear as skipped, not failed). The `webServer` builds the app itself.
- [ ] **Step 2: Compare the hologram on white.** In the dev server, light theme, look at the 2D fallback card (`BadgeFallback`) on the near-white bay for legibility. `src/three/palette.ts`'s light ink was approved on a steel bay; if it needs a tweak, make the smallest change and say so. The live WebGL scene can only be judged on the owner's real GPU: list it as a hand-off item.
- [ ] **Step 3: Commit** any palette tweak: `git commit -m "fix(hologram): keep the light ink legible on the white bay"`.

### Task 8: Contrast and visual baselines (once)

**Files:** Modify `src/lib/contrast.ts`; regenerate `e2e/visual.spec.ts-snapshots/*-win32.png` and later `*-linux.png`; modify the comment in `e2e/visual.spec.ts` (lines 11–12).

**Interfaces:** Produces new `CARD_BG_WORST_CASE`, `CHIP_BG_WORST_CASE`, `DARK_OPEN_BAND`, `DARK_OPEN_CHIP`, `LIGHT_CARD_BG_WORST_CASE`, `LIGHT_CHIP_BG_WORST_CASE`, `LIGHT_OPEN_BAND`, `LIGHT_OPEN_CHIP`, and the `light:` stage-bay background `#a1c1e4` (the darkest stop of the white bay gradient, `oklch(0.93 0.025 250)`). `TOKEN_CONTRAST_PAIRS` keeps its names; its minimum ratios never go down.

- [ ] **Step 1: Run axe as a smoke test only.** `npx playwright test e2e/a11y.spec.ts`. It cannot measure contrast over gradients and translucent glass (it reports those as "needs review", not failures), so a pass here is not evidence of contrast.
- [ ] **Step 2: Re-derive the grounds numerically.** With a throwaway script in the session scratchpad (not committed): per theme at 1440×900, screenshot `/` with `.app-window` hidden, find the brightest (dark) or darkest (light) pixel in the area the window covers, then composite, in sRGB, the **window `--panel` layer** and then the card and chip layers over it, the way the comment in `contrast.ts` describes. Update the eight constants, the `light:` stage-bay hex, and the comments that still name the magenta nebula and the steel sky.
- [ ] **Step 3: Run.** `npx vitest run src/lib/contrast.test.ts`. Expected: PASS at the existing minimums (7 for body text, 4.5 elsewhere). If a pair fails, change the token, not the minimum.
- [ ] **Step 4: Regenerate the win32 baselines** and fix the stale `visual.spec.ts` comment: `npx playwright test e2e/visual.spec.ts --update-snapshots` (detached). Look at the three PNGs: horizon glow at the bottom, a few faint stars at the top, white cards separated from the window, nothing busy. Show them to the owner before committing.
- [ ] **Step 5: Commit.** `git commit -m "test(contrast): re-derive worst-case grounds for the quiet backdrop and white theme"`; then the baselines in their own commit, `test(visual): refresh the win32 baselines`.
- [ ] **Step 6: Linux baselines (needs the owner's go to push).** CI runs `npx playwright test` on every push to `main` and every PR, so the visual spec fails until they exist. After the owner approves pushing the branch: `git push -u origin feat/quiet-background`, then in PowerShell `gh workflow run update-visual-baselines.yml --ref feat/quiet-background`, `gh run watch`, `gh run download <id> -n linux-visual-baselines`, review every PNG with the owner, copy them into `e2e/visual.spec.ts-snapshots/`, commit `test(visual): refresh the linux baselines`.

### Task 9: Dead code, docs and stale comments

**Files:** `src/lib/motion.ts`, `src/lib/motion.test.ts`, `docs/contracts.md`, `src/components/ui/BentoCard.tsx`, `src/features/pass/PassCard.tsx`, plus whatever the grep finds.

- [ ] **Step 1: Remove `motionOn`, tests first.** Delete its test in `motion.test.ts` (`motionOn is true exactly while the setting is on`), then the function in `motion.ts`; fix the header comment (lines 5–6) and the line-47 comment that cite the galaxy's draw loop. `subscribeMotion` stays. `npx vitest run src/lib` passes; `npm run typecheck` shows no remaining caller.
- [ ] **Step 2: Fix `docs/contracts.md` lines 99–101.** Ambient motion is now "the horizon glow's breathing and the star drift, the hologram's spin, the status ripple, entrance staggers, the project overlay's large motion", and it says the default is **off** (matches `DEFAULT_MOTION`), not "runs by default for everyone". Line 14 is dated history and stays.
- [ ] **Step 3: Rewrite the stale comments.** Grep `src`, `e2e` and `docs/contracts.md` for `nebula|comet|dot-grid|falling code|rocks|galaxyCanvas|starfield-grid`; fix each hit (known: `BentoCard.tsx` lines 20 and 47–48, `PassCard.tsx` lines 46–47, `contrast.ts`, `e2e/animations.spec.ts` lines 21 and 87). Skip `docs/session`, `docs/handoffs` and old plans (history). Expected after: no hits outside those.
- [ ] **Step 4: Commit.** `git commit -m "docs(motion): describe the quiet backdrop and drop the unused motionOn"`.

### Task 10: Full verification and hand-off

- [ ] **Step 1: Run every check, detached, and show the output.** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` (the last includes the `webgl` project, which is slow). Report any failure or skip exactly.
- [ ] **Step 2: Look at it.** Dev server detached; real browser; both themes; desktop and 390px phone; Animations off and on. Compare with the two mock-ups. Hand the owner these items only they can judge: the live WebGL hologram on a real GPU, and whether the white cards separate enough from the window.
- [ ] **Step 3: Finish.** Use `superpowers:finishing-a-development-branch`. No push or PR without the owner's go.

## Self-review notes

- Spec coverage: dark background, white theme, chrome colour, scrim, hologram, contrast, baselines (win32 and linux), contracts doc, motion policy, one-branch order. The `roundToggle` and overlay checks are in the Task 5 sweep.
- Names used across tasks are the same: classes `galaxy`, `stars`, `stars-near`, `horizon-line`; tokens `--horizon-glow`, `--star-strength`.
- Changed from the first draft after review: e2e tests now written first and seen red; axe demoted to a smoke test; the stale-word grep and comment rewrites made explicit; `motionOn` removal added; the docs commit, the baseline workflow and the public-repo check added; chrome colour needs two edits, not three (`boot.spec.ts` derives from `THEME_COLOR`).
