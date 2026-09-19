# Session 005 — Finishing the Hologram Redesign (Phases 4–7) and Shipping It

**Date:** 2026-09-19
**Repo:** `D:\Projects\mclector-dev` — https://github.com/McLector/mclector-dev
**Work branch:** `feat/hologram-redesign`, merged into `main` at the end of this session
**Final code commit at session end:** `7dbeb2c` (the session summary itself is the commit after it)
**Live URL:** https://mclector-dev.vercel.app

Like sessions 001–004, this is a record of *what happened and why*, not a task
handover. It exists so the next person (human or model) understands why the code
looks the way it does without re-deriving it. Session 004 built Phases 0–3 of
the redesign; this session built Phases 4–7 and shipped the whole thing.

---

## 1. What this session was

The owner pointed at `docs/session/004-session-summary.md` and
`docs/handoffs/001-hologram-redesign-handoff.md` and asked for the remaining
work to be planned and executed. That was **Phases 4–7** of
`docs/superpowers/plans/2026-09-19-hologram-portfolio-redesign.md`:

- **Skills** — the full GitHub set with real brand logos, smaller tiles and
  hover tooltips (the card was still placeholder-ish letter tiles).
- **Social honeycomb** — more links plus an arc-reactor blue hover glow.
- **Livelier subheaders** — an `Eyebrow` with a glowing lead dot (no `.eyebrow`
  style existed in the app at all).
- **The approved twilight light theme** — the branch still had the rejected
  "dawn" palette.
- **Themed overlays** — the project overlay and contact dialog were dark in
  both themes.
- **Verification** — typecheck, lint, unit tests, build, and an e2e suite that
  still described the pre-frame fluid-scroll layout.

The session began in plan mode (an approved written plan), then executed it.
The owner initially scoped it as "up to a live review, do not deploy"; after
looking at the dev server they asked for it to be committed and deployed, which
is why this summary also covers the merge (§6).

## 2. How the session was structured

1. **Read and explore.** Read the session-004 summary, the handoff and the
   plan; two parallel exploration passes mapped the current skills/social
   code and the theme/layout/overlay/e2e state. The mockup
   (`docs/reference/hologram-mockup.html`) was read for exact values.
2. **Plan + four owner decisions** (§3), written to a plan file and approved.
3. **Execution, tests first** (the owner's rule): write the failing test,
   watch it fail, implement, watch it pass, commit one logical unit at a time.
   Unit tests were run after every step.
4. **Screenshot-driven fixes.** After the first pass, real screenshots of the
   dev server in both themes exposed layout problems no unit test could catch
   (§5). Those drove a second round of fixes.
5. **e2e as a bug-finder.** Rewriting the responsive spec found a real
   layout bug (§5, finding 2).
6. **Ship.** Repo-safety checks, this summary, merge to `main`, push.

## 3. Decisions made this session (owner-confirmed)

| Decision | Choice |
|---|---|
| Skill group headings | Keep the 6-value `SkillGroup` type as the data model; render **4 merged display rows** exactly as the mockup ("Languages · Mobile", "Web · Data", "Hardware · Design · PM", "Tools · APIs"). |
| Near-black brand logos (Render, Anthropic ≈ `#000`–`#191919`) | Keep the real logo, but **clamp the hover accent to the arc cyan** when the brand hex fails 3:1 against that theme's tile. |
| X / Instagram / YouTube / TikTok URLs | `href: "#"` **placeholders** with a TODO. |
| Scope | Started as "Phases 4–7 up to live review, no deploy"; **changed by the owner to deploy** after seeing the running dev server. |

Technical calls made by the assistant (flag these if they look wrong):

- **Window design height 730 → 770.** The full 29-skill grid needs it; at 730
  the Tools row was cropped. Costs a ~4% smaller window on short laptop
  viewports, nothing at 1440×900.
- **A dark "projection bay" behind the hologram in light mode.** The additive
  cyan hologram washed out on the pale twilight sky.
- **Hex size fixed at 52px** (mockup value) instead of a viewport clamp.
- **e2e runs with 3D APIs disabled**, plus one dedicated `webgl` project (§5).
- **`profile.avatar.src`** now points at the portrait, so the fallback card and
  the 3D hologram show the same photo.

## 4. What was built (committed, oldest → newest)

- `4bb4ceb feat(skills)` — 29 skills; `skillRows`/`DISPLAY_ROWS` display layer
  in `groupSkills.ts`; `brandAccents()` (dark-brand clamp, reuses
  `contrastRatio`); `siRender` and `siClaude` added to the named-import
  registry; `SkillTooltip` (one body-portaled label, so the scaled window can't
  clip or shrink it); 7-column tiles with every label kept as `VisuallyHidden`
  text. Figma and Azure DevOps moved to the `hardware` group so the third row
  matches the mockup.
- `ba8a6ad feat(social)` — honeycomb grows from 3 to 7 hexes (the documented
  2·3·2 shape, so `hexNeighbors` needed no change); `tiktok` added to
  `SocialIconName`; brand glyphs for X/YouTube/TikTok from the mockup; arc
  hover glow.
- `a3d5db4 feat(ui)` — `Eyebrow` component (keeps real `h2` semantics via an
  `as` prop) applied across intro, skills, location, social, projects and
  certifications; `.count` for trailing numbers.
- `d386643 feat(theme)` — twilight palette; contrast budget extended (eyebrow in
  both themes, a light chip pair, tightened light worst-case ground);
  `--scrim` token; `ProjectOverlay`/`ContactDialog`/`Pill`/`Chip` moved onto
  tokens; the hologram's light-mode bay; `AppFrame` now sets the window size
  inline so it can't drift from the value fed to `useFitScale`.
- `ae8daad feat(layout)` — fixed-px card padding/radius/clock/hex/hologram
  height inside the window; compact certifications empty state; slim
  Contact/CV pills via a new `Button` `size` prop; `BadgeFallback` restyled from
  the lanyard ID card to a flat hologram card fed by `avatar.src`.
- `3db7853 fix(layout)` — the short/narrow-viewport bug (§5, finding 2).
- `7dbeb2c test(e2e)` — responsive spec rewritten for the frame, `hologram`
  spec + `webgl` project, twilight axe cases, light desktop baseline, all
  baselines regenerated.

## 5. Testing & verification

Everything below was actually run against the final tree, with real output:

- **Unit: 453 tests pass** (413 at the start of the session). New coverage:
  `skillRows`, `brandAccents`, skills tooltip, content invariants (every icon
  slug resolves; 29 skills; 7 socials), `Eyebrow`, `Button` size, contrast
  coverage, `BadgeFallback`, and a guard that fails on hard-coded
  white/black/neutral literals in the themed components.
- `typecheck`, `lint` and `build` clean.
- **e2e: 88 passed, 0 failed** across chromium, mobile-chrome and the new
  `webgl` project (15 skips are desktop-only specs on the mobile project).
  axe passes in **both** themes at desktop and mobile.
- **Bundle:** initial JS **157.32 kB gzip**, lazy `HologramCanvas` chunk
  **239.43 kB**. The initial chunk is **~2 kB over** the ~155 kB target
  (session-004 baseline 154.5 kB). It is the requested content (two logos, four
  social glyphs, new components) — the test-only contrast budget is tree-shaken
  out, checked by grepping the bundle. The available lever is lazy-loading
  `ContactDialog` and its zod schema.
- **Not verified:** the live WebGL look on a real GPU (headless software GL
  can't judge it), and the new `webgl` e2e guard was not mutation-tested (never
  seen failing against the old flat-card behaviour).

### Findings worth keeping

1. **`filter` runs before `clip-path`.** The mockup's hex glow puts
   `drop-shadow` on the same element as the hexagonal `clip-path`, so a real
   browser clips the glow away. The glow lives on the unclipped parent cell and
   follows the clipped child's silhouette. Confirmed in a screenshot.
2. **A real layout bug, found by e2e.** `.app-fit` was a `place-items: center`
   grid with auto tracks. When the design (1200×770) is bigger than the
   viewport, the track grew to the content size and the window was centred in
   *that*, then scaled around its own centre. At 1366×640 its bottom edge
   landed at 681px (41px cut off, unscrollable); at 1024×600 the right edge
   overshot by 5px. Fix: `grid-template: 100% / 100%`. It predates this session
   and only bites short or narrow viewports.
3. **Viewport units inside the scaled window keep sneaking in.** Session 004
   warned about breakpoints; the same trap hides in `clamp(... vw/vh ...)`. This
   session found it in the card padding token, the card radius token, the clock
   font size, the hex size and the hologram height (`58vh`). All fixed at px on
   desktop, with the fluid values kept for the unscaled mobile layout.
4. **Reduced motion now renders static WebGL**, which is the whole point of the
   session-004 fix — but headless software GL then pinned CPU and starved
   unrelated assertions into timeouts (a run had reached only 28/80 tests after
   ~7 minutes). e2e now launches with `--disable-3d-apis` (≈ 90 s total) and a
   single `webgl` project guards the original bug: reduced motion must mount
   `[data-pass-variant="webgl"]`, not the flat card.
5. **`color-mix` percentages that sum below 100% silently make the result
   translucent.** The mockup's skill group heading used 55% + 30%; it was
   aligned to the eyebrow's 62/38 so the contrast budget covers it.
6. **Screenshots caught what tests couldn't:** the cropped Tools row, the
   squeezed projects list, the invisible hexes and grey Location slab in light
   mode, and the washed-out hologram in light mode.

### Tooling notes (this machine)

- `python` is not on Git Bash's PATH, and `gh` is not on either shell's PATH —
  repo visibility was checked through the public GitHub API instead.
- Long inline `node -e '…'` scripts break on nested quotes; writing the script
  to a file in the scratchpad and running it was reliable.
- The e2e project lives on a hash-derived port (`playwright.config.ts`); it
  builds and previews itself, so no dev server is needed.

## 6. Deployment

Repo-safety checks (per the owner's CLAUDE.md) were run before shipping: the
repo is **public** (`"private": false` from the API); the only risky-looking
tracked file, `.env.example`, holds an empty `RESEND_API_KEY=`; nothing under
`portfolio content/` is tracked; the non-code artifacts in the diff are docs,
the vendored mockup, and the portrait that ships in the site anyway.

`feat/hologram-redesign` was merged into `main` and pushed. Vercel
(project `mclector-dev`) auto-deploys production from `main`. Whether the
deploy succeeded and the live URL serves the new build is verified separately
after the push — see the state section below and the chat that produced this
file.

The owner had **not** done a live review on a real GPU before asking for the
deploy. That review is still owed (§7).

## 7. State at the end of this session

- **Branch:** `main` contains the whole redesign; `feat/hologram-redesign` is
  merged. Working tree clean.
- **Verified clean:** `typecheck`, `lint`, `test` (453), `build`, `test:e2e`
  (88 passed).
- **Still owed by the owner:**
  - Real URLs for X, Instagram, YouTube and TikTok (currently `#`).
  - A live look on a real GPU in both themes, especially the hologram in the
    light-mode bay and the hover states.
  - Whether Certifications stay "coming soon".
- **Known rough edges (deliberately deferred):**
  - Initial JS is ~2 kB over the ~155 kB target (§5).
  - At short viewports there is some empty space between the hologram and its
    "Digital Pass" caption (the hologram container is a fixed 560px).
  - The contrast budget's hex values are hand-computed approximations of the
    oklch/`color-mix` tokens (the light chip ground especially); they need to be
    kept in sync by hand when a token changes.
  - `docs/contracts.md` still describes parts of the earlier layout; the frozen
    component contracts it lists are unchanged.
  - The dev server started for review may still be running on `:5173`.
- **Superseded:** `docs/handoffs/001-hologram-redesign-handoff.md` described
  Phases 4–7 as remaining work; they are now done. It is kept as history.

## 8. Where things live, for reference

- The plan this session executed:
  `docs/superpowers/plans/2026-09-19-hologram-portfolio-redesign.md`
  (session-scoped approval plan: `C:\Users\zanmo\.claude\plans\see-docs-session-004-session-file-md-misty-shore.md`)
- Visual/3D source of truth: `docs/reference/hologram-mockup.html`
- Skills: `src/features/skills/` (`groupSkills.ts`, `brandAccent.ts`,
  `skillIcons.ts`, `SkillTooltip.tsx`), content in `src/content/skills.ts`
- Social: `src/features/social/`, `src/content/socials.ts`
- Eyebrow: `src/components/ui/Eyebrow.tsx`; `.eyebrow`/`.count` in
  `src/styles/index.css`
- Theme + budget: `src/styles/index.css`, `src/lib/contrast.ts`, `src/lib/theme.ts`
- Frame: `src/layout/AppFrame.tsx`, `src/layout/bento.css`
- e2e: `e2e/` and `playwright.config.ts` (projects: `chromium`,
  `mobile-chrome`, `webgl`)
- Prior sessions: `docs/session/001–004-session-summary.md`;
  handoff: `docs/handoffs/001-hologram-redesign-handoff.md`
