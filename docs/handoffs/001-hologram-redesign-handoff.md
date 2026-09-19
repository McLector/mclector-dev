# Handoff 001 — Finish the Hologram Redesign (Phases 4–7)

**To:** the next agent (or human) picking up the mclector-dev portfolio redesign.
**From:** session 004 (2026-09-19).
**Read this fully before touching code.** Then read, in order: the plan, the
session summary, and the approved mockup. This document is the operating brief;
the plan is the step list.

---

## 0. TL;DR — where things stand

- The redesign is **~60% done** on branch **`feat/hologram-redesign`** (7
  commits ahead of `main`, clean working tree, **not pushed, not deployed**).
- Phases **0–3 of the plan are DONE and verified** (framed no-scroll window,
  alive galaxy, the 3D hologram-on-a-pedestal with the owner's photo rendered
  as a glowing cyan projection, and the reduced-motion "flat card" fix).
- **413 unit tests pass; `typecheck`/`lint`/`build` are clean.** e2e has NOT
  been updated and will fail until Phase 7 — do not trust it yet.
- The owner has **approved Phases 1–3 live** and the cyan hologram. Your job is
  **Phases 4–7**, then an owner live-review, then deploy.
- Production still serves the OLD site (`main`, session 003). Do not deploy
  until the owner signs off on the finished branch.

## 1. Get oriented (do this first)

Read these, in this order:
1. `docs/superpowers/plans/2026-09-19-hologram-portfolio-redesign.md` — the
   step-by-step plan. **Phases 4–7 are your remaining work.** Phases 0–3 are
   done; their checkboxes describe what already exists.
2. `docs/session/004-session-summary.md` — why the code looks the way it does.
3. `docs/reference/hologram-mockup.html` — the **visual/3D source of truth**
   (open it in a browser). Also live at
   `https://claude.ai/artifact/AHoYzfJrNjegBWPeYwkxpZ` (v5). It is **three r128
   from a CDN**; the app is **three 0.186 via r3f** — values don't transfer 1:1
   (see §4 gotchas).

Then get it running and see it (real GPU renders the WebGL that headless can't):
```bash
git checkout feat/hologram-redesign
npm ci            # if node_modules is missing
npm run dev       # open http://localhost:5173 (drag the hologram; move mouse for parallax; toggle theme top-right)
```

Sanity-check the baseline is green before you change anything:
```bash
npm run typecheck && npm run lint && npm test
```

## 2. What is already built (don't rebuild these)

- **Framed window / no-scroll:** `src/layout/AppFrame.tsx` + `useFitScale.ts`
  scale a fixed **1200×730** window to fit; mobile (<860px) scrolls.
  `BentoGrid.tsx` is **three flex columns** (`.bento__col`); `BentoCard.tsx`
  uses flex + a `grow` prop (no more `gridArea`). Mobile reflow via
  `display:contents` + `order` in `bento.css`.
- **Alive galaxy:** `GalaxyBackdrop.tsx` (canvas: asteroids/comets/data-rain +
  parallax) + `galaxyCanvas.ts` factories. Reduced-motion frozen.
- **Hologram 3D:** `src/three/HologramScene.tsx` (card + pedestal + beam),
  `HologramCanvas.tsx` (lazy), `textures/portraitTexture.ts` (photo loader with
  `coverCropUV`/`focalCropUV`). Photo: `src/assets/portfolio-pic.jpg`.
- **Render/animate decoupling (the flat-card fix):** `resolveSceneMode` in
  `src/lib/capability.ts`; `useSceneCapability` returns `{ mode, animated,
  config, dpr, reason }`; `PassCard` renders the hologram unless truly no-WebGL.
- **Tokens:** `--panel`, `--panel-edge`, `--arc` (#5ec8ff dark / #1f8fe0 light),
  `--arc-soft`, `--rain` are defined in `src/styles/index.css` for both themes.

## 3. Your work — Phases 4–7 (follow the plan; highlights below)

**Phase 4 — Skills (highest visible priority).** Right now the skills card
shows placeholder letter/label tiles and is cramped. Do:
- `src/content/skills.ts`: the FULL GitHub set is already listed with `icon`
  slugs. Confirm groups (`groupSkills.ts` `GROUP_ORDER`/`GROUP_LABELS`).
- `src/features/skills/skillIcons.ts`: extend the tree-shaken named imports
  with the brand marks that exist (`siRender`, `siAnthropic`, …); lettered
  fallback for AI-tools with no logo (Codex, Antigravity, OpenCode, Cline, Groq,
  Windows SAPI TTS, Blynk, PostGIS, Zustand, React Navigation, Azure DevOps).
- Rebuild `SkillsCard.tsx`: **real logos**, **smaller** tiles (7-col grid,
  ~56% icon), **hover tooltip** naming each (a single body-portaled label
  positioned from `getBoundingClientRect` — it must NOT be clipped by the
  scaled window; see the mockup `#tt`). Keep every label as accessible text.
  It already scrolls internally — keep that.

**Phase 5 — Social honeycomb + arc-reactor glow.** `social.css` +
`src/content/socials.ts` + `SocialHex.tsx` / `SocialIcon.tsx`. Add placeholder
socials (x, instagram, youtube, tiktok as `href:"#"`; extend `SocialIconName`
+ icons for x/tiktok). Hover (hover-fine): brighten fill + `filter:
drop-shadow(0 0 8px var(--arc-soft)) drop-shadow(0 0 16px var(--arc-soft))`
(works through the hex clip-path) + lift; reduced-motion keeps colour, drops lift.

**Phase 6 — Subheaders + twilight + refits.**
- `Eyebrow` component (arc-reactor lead dot + brighter cyan tint); replace raw
  `.eyebrow` usages across the cards.
- **Refine the twilight light theme** (the current light mode is basic; make it
  the softer "twilight galaxy" the owner approved). Redefine tokens under the
  three theme states in `index.css`; keep `body`/frame backgrounds explicit.
- **Extend the contrast budget** (`src/lib/contrast.ts` + test) for any new
  fg/bg pairs; `contrast.test.ts` must pass for BOTH themes.
- **Balance the right column** — projects is squeezed; give it room / internal
  scroll so all 4 show. Restyle Contact/CV as slim pills.
- **Theme the overlays:** `ProjectOverlay` is `bg-neutral-950/95` (dark in both
  themes) and `ContactDialog`/`Pill` still have `white/x` literals — make them
  token-based so light mode isn't jarring. They render via portal *outside* the
  scaled frame (correct — keep it that way).
- Optional polish: `BadgeFallback.tsx` still shows the old monogram; give it the
  photo + slim frame so the (rare) no-WebGL path matches.

**Phase 7 — Verify + deploy.**
- `typecheck`, `lint`, `test` (green), `build` (three.js stays lazy; initial
  gzip ≤ ~155 kB).
- **e2e needs fixing:** the `responsive.spec.ts` currently asserts *fluid
  scroll* at desktop — invert it to **no-scroll / fits**. Regenerate
  `visual.spec.ts` baselines (`npx playwright test --update-snapshots`; the
  badge + clock regions are masked). axe must pass in both themes.
- **Owner live-review** on a real GPU (headless can't fully judge the WebGL),
  THEN deploy.

## 4. Gotchas that will bite you (read these)

1. **three r128 → 0.186 colour management.** The mockup's brightness values do
   NOT transfer. The hologram looked dim until the photo texture was set to
   `THREE.NoColorSpace` (see `portraitTexture.ts`). If you port more from the
   mockup, feel-check emissive/additive brightness and expect to re-tune.
2. **The framed window is a fixed design that gets *scaled*.** Inside the
   window use **fixed sizes**, never viewport breakpoints (`sm:`/`lg:`). Mixing
   them fights the scale (it squished the intro/skills before we fixed it).
3. **Overlays must stay OUTSIDE `AppFrame`.** `ThemeToggle`, `ProjectOverlay`,
   `ContactDialog` are siblings of `AppFrame` in `App.tsx`. A transformed
   (scaled) ancestor breaks `position:fixed`. Body-portal tooltips for the same
   reason.
4. **Keep the `data-bento-area` contract** (8 areas, one each) — `App.test.tsx`
   asserts it. Keep `data-pass-variant="webgl"` on the canvas wrapper (tests +
   e2e key off it).
5. **`reduced-motion` renders STATIC 3D, not the flat card** — this is the
   owner's original bug, now fixed via `resolveSceneMode`. Don't reintroduce a
   reduced-motion→fallback branch. If the owner reports the hologram STILL
   doesn't show, it's a real WebGL/GPU failure — inspect
   `data-pass-fallback-reason` + console, don't guess.
6. **Windows / line endings:** commits warn `LF will be replaced by CRLF` —
   harmless. Use **PowerShell for `npm install` and `gh`** (Git Bash hits SSL
   DLL failures; `gh` isn't on its PATH). `ffmpeg` (if you need reference
   frames) is installed at
   `C:\Users\zanmo\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-*\bin\ffmpeg.exe`.

## 5. Verifying visuals (headless can't settle live WebGL)

Headless chromium uses slow software GL; the animated scene may not render well
there. Two reliable ways to *see* it:
- Ask the owner to open `http://localhost:5173` (real GPU).
- Screenshot the local dev server with Playwright launched with
  `--use-gl=angle --use-angle=swiftshader --ignore-gpu-blocklist` and a ~5s
  wait (this is how session 004 verified the hologram). Non-WebGL UI (skills,
  social, layout, theme) screenshots fine either way.

Do NOT commit screenshot scripts — write them to the scratchpad, run, delete.

## 6. Deploy (only when finished + owner-approved)

Production auto-deploys from `main` (Vercel, project `mclector-dev`,
`prj_GaQgtBSVOinIEZIvQxnjwG9mqAEr` / team `team_vphcPvrhh1PdK0pLwW50PXEH`). The
redesign is on `feat/hologram-redesign`. When Phases 4–7 are done and the owner
has reviewed a live preview:
1. Push the branch, open a PR (or fast-forward `main` if the owner prefers).
2. Merging to `main` triggers the production deploy. Verify the live URL serves
   the new build (check for `.app-window` / `HologramCanvas` chunk).
- Commit style: **Conventional Commits, no AI attribution / no
  `Co-Authored-By`** (owner's CLAUDE.md rule). Never commit secrets or the
  `portfolio content/` folder (gitignored).

## 7. Still owed by the owner (content)

- Real **social URLs** for X / Instagram / YouTube / TikTok (currently `#`
  placeholders). Ask; don't invent.
- Whether **Certifications** stay "coming soon" or they have real ones.
- (Optional) a brighter/cleaner headshot if they later want the hologram less
  backlit — the current photo is a dusk profile shot; the shader lifts it, but
  a front-lit photo would read even better.

## 8. One-line status to repeat back to the owner

"Phases 1–3 done on `feat/hologram-redesign` (framed no-scroll shell, alive
galaxy, cyan hologram of your photo, flat-card fixed); Phases 4–7 remain
(skills logos+tooltips, arc-reactor hex glow, subheaders, twilight, verify,
deploy). Nothing is deployed yet — production still shows the old site."
