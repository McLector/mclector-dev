# Session 009 — Round 3: Hover That Always Works, an Animations Toggle, Steel Light Theme, a Polished Neon Sign, and the M-in-Reactor-in-Hex Mark

**Date:** 2026-09-20
**Repo:** `D:\Projects\mclector-dev` — https://github.com/McLector/mclector-dev
**Work branch:** `feat/round-3-hover-motion-palette` (from `main` at `e6d1a20`). **Nothing is committed, pushed or deployed** — the owner has not said to.
**Live URL:** https://mclector-dev.vercel.app (still the session-008 build)

Like sessions 001–008, this records *what happened and why*, not a task handover. Flow: **plan → mockup → review → implement → prove**.

---

## 1. What this session was

The owner's six items: (1) hover animations missing on their laptop, fine on their PC; (2) a real logo for the tab; (3) the light theme still "off"; (4) the Digital Pass lower and Download CV under the sign; (5) the neon sign too heavy / "AI look"; (6) the "Open to" card sleeker.

After reviewing the round-3 mockup they decided: **steel** for light mode; **keep** the "Open to" band and polish it (must stay easily noticeable); **keep** the neon sign and polish it; the **M inside the arc reactor inside a hexagon**; and, on item 1, effects **consistent regardless of system settings**, with **hover locked on** and a visible **Animations toggle** for ambient motion, on by default.

## 2. Item 1 — the root cause, and why the obvious fix was not enough

`social.css` shows the hexagon names **permanently** whenever `@media (hover: hover) and (pointer: fine)` is false. The owner's laptop showed the names permanently, in **both Chrome and Brave**, so that query was failing there. The skill tiles, the hexagons and the sign all sat behind the same query. It was **not** the OS animation setting.

Chrome and Brave are both Chromium, so the cause is the device reporting no fine, hover-capable primary pointer (a touchscreen laptop is the usual suspect; not confirmed from here). If it reports `hover: none`, simply dropping `pointer: fine` would not have fixed it. So hover is no longer keyed to a media query at all:

- `src/lib/inputMode.ts` decides `html[data-input]` (`mouse` | `touch`) from **real pointer events**; the inline boot script seeds a first-paint hint from `(any-hover: hover)`. With no evidence of a mouse the default is **touch**: names visible, nothing depends on hover.
- Every hover rule keys off `:root[data-input="mouse"]`. Tailwind's built-in `hover` variant is **overridden** to the same rule, so plain `hover:` and `group-hover:` follow it too.
- Hand-written CSS uses `:where(:root[data-input="mouse"]) …` to keep specificity unchanged. This matters: a higher-specificity hover would have silently beaten the hexagon's `:active` press feedback.

### Two more hover bugs found on the way (both present on every browser)

- `transition-[colors,transform]` compiles to `transition-property: colors, transform`, and `colors` is not a CSS property, so colours never faded. **Measured in a frame timeline:** with `colors` a project row is at its final colour on the first frame; with valid properties it ramps 0 → 0.064 → 0.08. Fixed in four places.
- The global reduced-motion rule forced every transition to ~0ms, so hover snapped for anyone with the OS setting on. Removed (see §3).

## 3. Motion policy (owner decision, flagged once, then followed)

- **Hover and focus transitions are locked on**, in every state, for everyone.
- **Ambient motion** (starfield, falling code, rocks, comet, parallax, the hologram's spin, the status ripple, entrance staggers, the overlay's large motion) is governed only by a visible **Animations toggle**, **on by default**, persisted as `localStorage["mclector-motion"]`. The OS `prefers-reduced-motion` setting is **never read**.
- I raised the health concern once (continuous motion is what the setting exists to stop). The owner chose "everything, always"; the toggle is the mitigation, which is why it is visible, labelled and keyboard-operable. Seeding the default from the OS later is a one-line change in `resolveInitialMotion`.
- `src/lib/motion.ts` (pure logic + store; the `<html data-motion>` attribute is the single source of truth), `useMotion.ts`, `MotionToggle.tsx`. CSS off-rule freezes keyframes, **zeroes `animation-delay`** (found by a test: cards otherwise sat blank for up to 0.32s), and **never touches `transition-*`**.
- `GalaxyBackdrop` reads the setting **per frame** rather than re-running its effect (its loop kept running under reduced motion anyway), so there is no teardown and no stacked-loop risk; it also resets the parallax offset on switching off.
- **The e2e suite** froze ambient motion with Playwright's `reducedMotion: "reduce"`. With the OS setting ignored that lever is gone, so the suite now runs with the toggle **off** via `storageState` (`localStorage` on the preview origin). Specs that need the animated site opt out.

## 4. Decisions

| Item | Decision |
|---|---|
| Light theme | **Steel** (owner's pick from the mockup): hue ~250, low chroma, mid-tone hue-matched hologram bay, nebula re-tinted into one blue family. Tokens ported **verbatim** from the mockup's own generator. |
| Neon sign | **N1 "clean tube"**: lit tube ring + one soft bloom, flat plate, address in Sora, no screws / arrow / flicker / text glow. **Exactly 42px tall** so the hologram stage stays 630px. |
| "Open to" | **O1 "refined band"**: same band, a 17%→11% arc gradient, a soft top highlight, chips tinted with **no rings**, the arc dot on the label. |
| Centre column | Sign → **Download CV** → stage (owner did not object to the mockup's order). |
| Toggle | **Icon circle**, stacked **directly below** the theme toggle (owner's call over my labelled-pill recommendation). |
| Logo | **L1 hex tile, full cut at every size** (owner's call; see §7). |
| Not built | The card-edge hover and Download CV lift I mocked. The owner asked for existing effects to work, not new ones. |

Technical calls by the assistant (flag if wrong): the mark **replaces** the `@McLector` eyebrow's arc dot (one lead glyph, not two); the light `--color-surface` tokens were retuned 265→250 hue for coherence (never shown in the mockup); Tailwind is told to ignore `docs/` (`@source not`); `ROUND_TOGGLE_CLASSES` extracted so the two round toggles cannot drift.

## 5. Testing & verification

Everything below was run against the final tree. TDD throughout: each new test was watched **fail for the right reason** first.

- **Unit: 556 passed / 46 files** (485 / 40 at the start). `typecheck`, `lint` clean. New: `motion`, `useMotion`, `inputMode`, `MotionToggle`, `BrandMark`, and `hoverAndMotionPolicy` (source-scan guards); extended: `capability`, `useSceneCapability`, `PassCard`, `ProjectOverlay`, `IntroCard`, `Chip`, `ConnectSign`, `LocationCard`, `brandAccent`, `App`, `contrast`.
- **e2e at one worker (as CI runs it): 158 passed, 42 skipped, 0 failed** (4.5 min). Session baseline before any change: 118 / 24 / 0. The two hologram flakes from session 008 passed on both the baseline and the final run.
- **The failing case is tested directly** (`e2e/no-hover-browser.spec.ts`): Chromium launched with `--blink-settings=primaryHoverType=1,availableHoverTypes=1,primaryPointerType=2,availablePointerTypes=2`. The spec first asserts the browser really reports `hover: none`, `any-hover: none`, `pointer: fine` false (so a wrong flag fails loudly). Then: names start visible (touch), the first real mouse move flips `data-input` to `mouse`, names tuck away, and the hexagons, skill tiles and sign all animate with non-zero transition durations.
- **Compiled-output guard** (`e2e/compiled-css.spec.ts`): the built CSS has no `hover:hover`, `hover:none`, `pointer:fine`, `prefers-reduced-motion`, or `transition-property:colors`; hover is keyed to `data-input=mouse` for `hover:`, `group-hover:` and hand-written rules alike. This guard **caught a real leak**: Tailwind scans every file in the repo, so a class-shaped token in a comment (in my own test and mockup) generated a real `colors` rule. Fixed at the source, and `docs/` is now excluded.
- **Hover locked on, measured** under four combinations of the toggle and the OS setting: with animations off, ambient keyframes freeze (`1e-06s`) while hover keeps its 0.15s transition and lifts; with them on, ambient runs even when the OS asks for less.
- **Contrast** recomputed by compositing (glass over the steel panel over the darkest sky stop = `#eaf0f7`, matching the rendered card `238,243,247`); every pair clears its minimum (lowest: light green-ink pill 4.86:1).
- **"Easily noticeable", measured** (CIE76 dE, real rendered pixels, band vs card): **shipped 15.0 dark / 11.1 light** vs today's band 13.3 / 10.9. Two of my own first mockup drafts (O2, O3) failed this bar and were strengthened before being shown.
- **Skill-tile ground** for `brandAccent` **measured** from the rendered tile (`#e2effe`, identical across 12 tiles) rather than estimated.
- **Visual baselines** regenerated and **looked at** (all three). **Stage height stays 630px**; the stage is flush with the neighbouring columns.

### Not verified

- **The fix on the owner's actual laptop.** Nothing here reproduces their machine; the flagged-browser test reproduces the *symptom class*, not their hardware. The real proof is opening a preview on it.
- **The hologram on a real GPU** (software GL only), and the mark in a real tab strip.
- **Mobile beyond the baseline screenshot** (see §7).

## 6. Findings worth keeping

1. **A media query answers "what is this device?", not "what is the visitor using?".** Some laptops answer wrongly, and hover then silently dies. Key hover to real input events, and default to the safe touch state.
2. **`transition-[colors,…]` silently does nothing.** No error, no warning; the property list just contains an unknown identifier.
3. **Tailwind scans everything, comments and mockups included.** A class-shaped token in prose becomes a CSS rule. A guard on the *built* CSS finds what a source review cannot.
4. **Tailwind v4 builds `group-hover` on top of `hover`** (a compound variant), so overriding `hover` carries it. Verified in the compiled CSS: `:is(:where(.group):where(:root[data-input=mouse] *):hover *)`.
5. **Prefixing a rule with an attribute raises its specificity** and can silently beat a later `:active` rule; wrap the prefix in `:where()`.
6. **`animation-fill-mode: both` + a per-item delay** means shortening only the duration leaves elements blank until the delay elapses. Zero the delay too.
7. **Three nested layers do not survive 16px.** Measured on the mockup: the ring and the M merge into a blob. (See §7 for what shipped.)
8. **`aria-pressed` plus a label that changes with state double-announces** (`ThemeToggle` does this); `MotionToggle` uses a constant name and `aria-pressed`. A first mockup draft also broke WCAG label-in-name ("Motion: On" vs an "Animations" name); caught in review.
9. **The `motion` animation library reads `prefers-reduced-motion` internally** but its default `reducedMotion: "never"` config ignores the answer, so a JS-bundle scan for the string would be a false alarm.
10. **Playwright will not accept `launchOptions` inside a `describe`**, only at the top of a spec file.

### Tooling notes (this machine)

- A shell left **inside `dist/assets`** made Vite's `emptyDir` fail with `EPERM` (Windows will not delete a process's working directory). Do not `cd` into build output.
- **Heredocs and `sed` eat backslashes** in this tool layer, corrupting regexes: a `\b` became a literal backspace and produced a test that could never fail. Use the Edit/Write tools for anything with escapes. A scan for stray control characters confirmed none remain.
- `grep -r` over the repo root walks `node_modules` and times out; use the Grep tool.
- The working tree is CRLF (`core.autocrlf=true`); new files are LF and git warns on conversion — harmless.

## 7. Known rough edges (deliberately left, or the owner's call)

- **16px favicon.** The owner chose the **full cut everywhere**. At exactly 16px (a tab at 100% display scaling) the M and ring merge into a blob; at 18px the M is legible and at 24/32px it is crisp. Most laptops scale 125–200%, where the tab icon is 20–32 physical px. A hex + bold-M **tiny cut** (verified geometry, M clear of the hexagon) exists in the round-3b logo sheet if this ever bothers them: it would be a one-file change to `public/favicon.svg`.
- **Mobile toggles.** The stacked toggles are fixed top-right and the second now reaches over the top-right corner of the first card (the theme toggle already overlapped the window corner). Decide whether to shrink or relocate them on phones.
- **The sign wraps to two lines on a phone** (as before); its `min-height: 42px` lets it grow.
- **First-mouse-move jump** where a browser claims no hover: the hexagon names hide the first time a real mouse moves (animated by the existing 180ms transition).
- Two brand colours (Figma orange, one custom blue) now keep their own hover colour in light mode; both are only just over the 3:1 line (3.06, 3.01), pinned by a test.
- `resolveQualityTier` in `capability.ts` is dead code (only its own tests call it); renamed, not deleted.
- Carried over: real URLs for X / Instagram / TikTok / Upwork and a CV PDF; `badge.subtitle` still reads "CS Student · Mobile Dev"; the README still describes a "physics-driven lanyard badge"; Linux CI visual baselines.

## 8. State at the end of this session

- **Branch:** `feat/round-3-hover-motion-palette`, **uncommitted**: 43 modified files, 24 untracked (16 source/test/e2e, the two mockups + two logo sheets, `008` and this summary).
- **Verified clean on the final tree:** `typecheck`, `lint`, `test` (556 / 46), `test:e2e` (158 passed, 42 skipped, 0 failed).
- **Still owed by the owner:**
  - **A go to commit** and, separately, a go to deploy a **preview** so they can check the laptop. After the deploy, in the console: `document.documentElement.dataset.input` should read `mouse` once they move the mouse, and the hexagons should tuck their names away and lift on hover.
  - Whether to commit the mockups. The repo is **public**; the round-2 mockup with both photos is already committed. The round-3 and round-3b mockups also embed the photos and are intermediates: commit only the final approved one and the logo sheet, if at all.
  - A look at the hologram on a real GPU, the mark in a real tab strip, and one click on the sign to confirm Gmail compose.
  - A decision on the mobile toggle placement.

## 9. Where things live

- Hover: `src/lib/inputMode.ts`, `src/styles/index.css` (the `hover` / `hover-fine` variants), `social.css`, `connect.css`
- Motion: `src/lib/motion.ts`, `useMotion.ts`, `src/components/ui/MotionToggle.tsx` + `roundToggle.ts`, the `[data-motion="off"]` rule in `src/styles/index.css`, `GalaxyBackdrop.tsx`, `capability.ts`, `useSceneCapability.ts`, `ProjectOverlay.tsx`
- Boot script (theme + motion + input mode): `index.html`
- Palette: `src/styles/index.css` (`:root[data-theme="light"]`), `src/lib/contrast.ts` (hand-synced hexes), `brandAccent.ts` (measured tile ground), `theme.ts`
- Sign: `src/features/connect/` · "Open to": `src/features/intro/IntroCard.tsx`, `src/components/ui/Chip.tsx`
- Mark: `public/favicon.svg` + `src/components/ui/BrandMark.tsx` (a test keeps them identical)
- Guards: `src/lib/hoverAndMotionPolicy.test.ts`, `e2e/compiled-css.spec.ts`, `e2e/hover.spec.ts`, `e2e/no-hover-browser.spec.ts`, `e2e/animations.spec.ts`, `e2e/boot.spec.ts`
- Policy write-up: `docs/contracts.md` ("Hover and motion policy")
- Approved references (untracked): `docs/reference/2026-09-20-revamp-round-3b-mockup.html`, `docs/reference/2026-09-20-round-3b-logo-sheet.html`
- Prior sessions: `docs/session/001–008-session-summary.md`
