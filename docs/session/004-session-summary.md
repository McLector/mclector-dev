# Session 004 — Hologram Redesign (Framed No-Scroll Shell, 3D Hologram, Alive Galaxy)

**Date:** 2026-09-19
**Repo:** `D:\Projects\mclector-dev` — https://github.com/McLector/mclector-dev
**Work branch:** `feat/hologram-redesign` (7 commits ahead of `main`; **not merged, not deployed**)
**Main tip at session end:** `3aa8dfa` (session 003's work — still what production serves)
**Live URL (unchanged this session):** https://mclector-dev.vercel.app

Like sessions 001–003, this is a record of *what happened and why*, not a task
handover — the actual "what to do next" lives in `docs/handoffs/001-hologram-redesign-handoff.md`.
This file exists so the next person (human or model) understands why the code
and the plan look the way they do without re-deriving it.

---

## 1. What this session was

The owner was still unhappy with the session 001–003 result (the "galaxy +
fluid + lanyard badge" site that is live now). Across a long back-and-forth
they asked for a substantially different design:

- **A framed window that fits one screen with no scroll** (they explicitly
  missed the framed container and disliked having to zoom to 75%).
- **A galaxy background that feels alive** (twinkling stars *plus* moving
  elements — asteroids, comets, a Matrix-style binary data-rain).
- **A better 3D centrepiece** — the lanyard badge read "cheap"; they wanted a
  proper 3D object. After iterating we landed on a **floating hologram portrait
  card on a sci-fi projector pedestal with a light beam** (their reference
  image was a holographic globe on a projector base).
- **Their real photo on the hologram**, rendered as a distinctive **glowing
  cyan hologram projection** (not a flat tinted photo).
- **The full GitHub skill set** with real brand logos + hover tooltips.
- **Honeycomb social links** with an **arc-reactor-blue** (Iron-Man cyan) hover
  glow, livelier subheaders, a refined **twilight** light mode.
- A confirmed **root-cause fix**: the owner only ever saw the *flat 2D
  fallback* because the capability gate treated reduced-motion / low-GPU as
  "no 3D".

The bulk of the session was **design iteration in a throwaway mockup**, then a
written implementation plan, then **execution of Phases 0–3** of that plan on a
feature branch. Phases 4–7 remain (see the handoff).

## 2. How the session was structured

1. **Brainstorming (`superpowers:brainstorming`)** to pin the direction, with
   several `AskUserQuestion` decisions (see §3).
2. **Five iterations of an interactive mockup** published as a Claude Artifact
   (`https://claude.ai/artifact/AHoYzfJrNjegBWPeYwkxpZ`, v5 approved). The
   mockup is the visual/3D source of truth; a copy is vendored at
   `docs/reference/hologram-mockup.html`. It uses **three r128 from a CDN** —
   the real app uses **three 0.186 via r3f**, which mattered (see §4/§5).
3. **Implementation plan (`superpowers:writing-plans`)** written to
   `docs/superpowers/plans/2026-09-19-hologram-portfolio-redesign.md`, reviewed
   twice against the whole conversation, gaps fixed inline.
4. **Execution on `feat/hologram-redesign`**, TDD-first for pure logic,
   screenshot/live-verify for visuals, one commit per task/phase.

## 3. Decisions made this session (owner-confirmed)

| Decision | Choice |
|---|---|
| No-scroll strategy | **Scale-to-fit** — a fixed 1200×730 window scaled as one unit to fit the viewport; mobile scrolls. |
| Framed container | **Bring it back** (they loved the panel that holds the cards). |
| 3D centrepiece | **Floating hologram portrait card** (not a planet, not the old ID-pass, not a switcher of objects). |
| Photo on the object | **Yes**, cover/focal-cropped onto the card. |
| Hologram look | Slim HUD frame on a **projector pedestal + light beam**; then a **glowing cyan hologram projection** of the photo. |
| Light mode | **Twilight galaxy** (softer, lighter — the earlier "dawn" was rejected). |
| Skills | **Full GitHub set**, real brand logos, smaller tiles, **hover tooltips**. |
| Social links | **Hexagon honeycomb** (they said "pentagon" but confirmed hexagons like the reference video), arc-reactor hover glow, +placeholders. |
| Subheaders | Livelier — arc-reactor lead dot + brighter cyan tint. |
| Render vs animate | **Decouple**: reduced-motion / low-GPU render the 3D *statically*, never the flat 2D card. |

Technical calls: **drop `@react-three/rapier`, `meshline`, `postprocessing`**
(the hologram needs no physics/bloom); **sample the photo texture with
`NoColorSpace`** so three 0.186's colour management doesn't dim the hologram.

## 4. What was built (Phases 0–3, committed on the branch)

Seven commits, oldest→newest:

- `chore(assets)` — vendored the approved mockup + the owner's photo
  (`src/assets/portfolio-pic.jpg`), gitignored the `portfolio content/` drop
  folder, and committed the plan.
- `feat(layout): add fit-to-viewport scale hook` — `src/layout/useFitScale.ts`
  (+ test): `computeFitScale`/`useFitScale`, TDD.
- `feat(layout): frame the portfolio in a scale-to-fit window` — `AppFrame`
  (the scaled `.window`), `BentoGrid` rebuilt into **three flex columns**,
  `BentoCard` dropped `gridArea` (now flex + `grow`), `bento.css`/`index.css`
  reworked (frame + `--arc`/`--panel` tokens, mobile `display:contents` reflow).
  Cards inside the window use **fixed sizes**, not viewport breakpoints (the
  whole window is scaled). Skills scroll internally; intro compacted.
- `feat(bg): alive galaxy` — `GalaxyBackdrop` now runs a 2D canvas of
  **asteroids + comets + binary data-rain** + **mouse parallax**; pure
  factories in `src/layout/galaxyCanvas.ts` (+ test). Reduced-motion freezes it.
- `feat(3d): replace lanyard with hologram card on a projector pedestal` —
  the big swap:
  - **Removed** `LanyardScene/Canvas`, `badgeFaceTexture`/`bandTexture`/
    `createTextures`, `meshline.d.ts`, `math/dragPlane`, `e2eMode`, and the
    `passThemes`/`PassThemeSwitcher`.
  - **Added** `HologramScene.tsx` (card + pedestal + beam, built imperatively
    and mounted via `<primitive>`, animated in `useFrame` gated by `animated`),
    `HologramCanvas.tsx` (lazy Canvas boundary, `data-pass-variant="webgl"`),
    `textures/portraitTexture.ts` (+ test: `coverCropUV`/`focalCropUV`/loader).
  - **Capability decoupling**: `resolveSceneMode` in `src/lib/capability.ts`
    (`full`/`static`/`fallback`) + `resolveHardwareTier`; `useSceneCapability`
    now returns `{ mode, animated, config, dpr, reason }`. `PassCard` renders
    the hologram unless truly no-WebGL. **This is the flat-card fix.**
  - Bundle: lazy 3D chunk **1.14 MB → 239 kB gzip**; initial 154 kB gzip.
- `feat(3d): make the hologram portrait clearly visible and distinctive` —
  focal-crop onto the subject (`zoom 1.5, focus 0.48/0.6`) + shader shadow-lift.
- `feat(3d): render the portrait as a glowing cyan hologram projection` — the
  holo fragment shader now luminance-maps the photo to a cyan ramp with hard
  scanlines, a sweeping scan band, chromatic fringe, edge rim-glow, flicker and
  a see-through background; texture set to `NoColorSpace`. **Owner asked for
  "10x more distinctive" — this is the result they were shown.**

## 5. Testing & verification

Everything below was run, real output confirmed (not diff-trusted):

- **413 unit tests pass** (was 470 on main; net change is removed lanyard tests
  minus new logic tests: `useFitScale`, `galaxyCanvas`, `coverCropUV`,
  `resolveSceneMode`, updated capability/pass/BentoCard tests).
- `typecheck`, `lint`, `build` all clean. Initial gzip **154.5 kB** (budget
  ~155 kB), lazy `HologramCanvas` chunk **238.8 kB gzip**.
- **e2e NOT re-run this session** — the framed-layout change inverts the
  `responsive.spec` expectations and the `visual.spec` baselines must be
  regenerated (Phase 7 work). Don't trust e2e until then.
- **Real screenshots** of the live dev server (real WebGL, non-reduced) confirm
  the hologram, pedestal, beam and the cyan projection render with no console
  errors under swiftshader — so a real GPU is safe.

### Two findings worth keeping

1. **r128 mockup → three 0.186 colour management** is the sharp edge. The
   mockup's brightness values don't transfer 1:1; the hologram looked dim until
   the photo texture was set to `NoColorSpace`. Feel-check emissive/additive
   brightness when porting anything else from the mockup.
2. **The framed window is a fixed design that gets scaled** — do NOT use
   viewport breakpoints (`sm:`/`lg:`) for sizing inside it; use fixed sizes, or
   the scaled design fights the breakpoints (this squished the intro/skills at
   first).

## 6. Deployment

**None.** Nothing was pushed or deployed this session. Production still serves
`main` (`3aa8dfa`, the session-003 galaxy/lanyard site). The redesign lives
only on the local `feat/hologram-redesign` branch. Deploy happens after
Phases 4–7 and an owner live-review (see the handoff).

## 7. State at the end of this session

- **Branch:** `feat/hologram-redesign`, clean working tree, 7 commits ahead of
  `main`. Not pushed.
- **Verified clean:** `typecheck`, `lint`, `test` (413), `build`.
- **Owner sign-off:** approved Phases 1–3 live ("looking decent"); specifically
  asked for and approved the more-distinctive cyan hologram. Explicitly said
  the rest "can be polished later".
- **Remaining:** Phases 4–7 of the plan — skills real logos + tooltips,
  arc-reactor hex glow, livelier subheaders, twilight refinement + right-column
  balance, BadgeFallback restyle, then verification (e2e/baselines) + deploy.
- **Known rough edges (deliberately deferred):** skills tiles are still
  placeholder-ish letter/label tiles (Phase 4 replaces with real logos);
  projects list is squeezed in the right column (Phase 6 balance);
  `BadgeFallback` still shows the old monogram, not the photo (Phase 3.5 polish);
  the dev server was left running on `:5173` during the session (stop it).

## 8. Where things live, for reference

- **The handoff (do this next):** `docs/handoffs/001-hologram-redesign-handoff.md`
- **Implementation plan:** `docs/superpowers/plans/2026-09-19-hologram-portfolio-redesign.md`
- **Approved mockup (visual/3D source of truth):**
  `docs/reference/hologram-mockup.html` — and the live artifact
  `https://claude.ai/artifact/AHoYzfJrNjegBWPeYwkxpZ` (v5).
- **Photo asset:** `src/assets/portfolio-pic.jpg` (source drop:
  `portfolio content/`, gitignored).
- Prior sessions: `docs/session/001–003-session-summary.md`.
