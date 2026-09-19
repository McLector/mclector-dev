# Session 006 — Revamp Round: Mockup-First Polish, the Real Hologram Bug, and Shipping It

**Date:** 2026-09-19
**Repo:** `D:\Projects\mclector-dev` — https://github.com/McLector/mclector-dev
**Work branch:** `feat/portfolio-revamp`, fast-forwarded into `main` at the end of this session
**Final commit at session end:** `24a4dfe` (the session summary itself is the commit after it, if it is committed)
**Live URL:** https://mclector-dev.vercel.app

Like sessions 001–005, this is a record of *what happened and why*, not a task
handover. It exists so the next person (human or model) understands why the code
looks the way it does without re-deriving it. Session 005 shipped the hologram
redesign; this session is the owner's first round of feedback on the shipped
site, done as **plan → mockup → approval → port → verify → ship**.

---

## 1. What this session was

The owner looked at the deployed site and sent twelve changes (with two
reference images — the current hologram and a target: a projector whose light
fans up and out from a glowing base):

1. Light theme "looks meh" — improve or polish it.
2. Keep the placeholder social links blank.
3. The hologram is **not in the middle on the live deployment**.
4. "Instagram" in its hexagon truncated to "instagr..".
5. Hex icons were off-centre at rest; centre them and lift on hover to show the name.
6. The other skill/tool icons did not show their real logos.
7. Remove "Contact me"; "CV" becomes "Download CV", centred under "Digital Pass",
   with the portrait subject aligned to the hologram's axis.
8. "Elsewhere" → "Contact & Socials".
9. A neon "Let's Connect → email" sign, easily noticeable.
10. A new bio.
11. A "Currently Active" indicator on the intro card.
12. Make the hologram look like the reference image.

The owner's process instruction was explicit: **plan first, then a mockup to
review until approved, then implement.** Everything below follows that order.

## 2. How the session was structured

1. **Plan mode, in two rounds, each sent back for review before approval.**
   Round one (the 12 items → a plan for the mockup and port): the owner rejected
   it twice ("review plan, double check"; "there might be stuff you missed")
   before approving. After the mockup was approved, round two (turning it into an
   exact port spec): rejected twice more ("perform another review"; "last review
   check") before approving. Every pass found real errors — see §5. Those
   reviews are the reason the port matched the mockup so closely.
2. **Mockup** (`docs/reference/2026-09-19-revamp-mockup.html`): one standalone
   file, real three.js, both themes, plus a "review controls" panel (beam
   intensity, portrait `focusX`, axis guide, mark-approximated-logos, CV state)
   that is not part of the site. The owner approved it after **one round of
   feedback** (dim the beam, tone down the sign's glow, move the sign — §3).
   Verified in real headless Chromium with software WebGL.
3. **Fidelity method** (the plan's key idea): treat the mockup as the normative
   spec and prove the port against it with a **per-element geometry diff** —
   `getBoundingClientRect()` for ~61 paired elements in mockup vs running app at
   1440×900, both themes — instead of trusting "looks the same".
4. **Port, tests first** (the owner's rule): write failing tests, watch them
   fail for the right reason, implement, watch them pass.
5. **Verify with real renders.** Screenshots caught two bugs no test could (§5).
6. **Ship.** Nine commits on a branch, pushed for a preview, then fast-forwarded
   into `main` on the owner's instruction (§6).

## 3. Decisions made this session (owner-confirmed)

| Decision | Choice |
|---|---|
| Light theme direction | **Deepen the twilight** — keep the lilac dusk, build a real value ladder (saturated sky → deeper indigo window → bright floating cards) and use the arc blue at real size. Not "go darker", not "clean daylight". |
| Contact form | **Delete entirely.** The neon sign's `mailto:` is the only contact path. |
| Missing logos | Hand-roll SVGs in a local registry, no new dependency (in practice: real logos where a permissive source exists, else drawn stand-ins — §4). |
| CV | **Keep the placeholder (disabled) state**; only move and relabel the button. |
| Beam intensity | The owner reviewed at the slider's **minimum (0.4)** and kept it — baked in as `uGain = 0.4`. |
| Neon sign | Tone the email glow **down** for legibility, and **move it above the hologram**, centred on the Download CV axis (originally it sat in the left column). |
| Window height | Stays **770**. With the sign in the left column the skills grid clipped and the mockup needed 806; moving the sign freed the height. |
| Commit / deploy | Commit on a branch → push (Vercel preview) → **push to `main`** (production), each on an explicit owner instruction. |

Technical calls made by the assistant (flag these if they look wrong):

- **`Profile.availability` replaced by `openTo: string[]`.** The field was set but
  never rendered, and contradicted the new bio.
- **Kept the location card's map/wash decorations.** The mockup happened to omit
  them and the owner never asked to remove them.
- **Theme toggle** adopts the mockup's `--panel` surface but keeps its live
  40px size/position (the mockup's 44px was inherited, not reviewed).
- **New `Button` variants** (`download`, `downloadReady`) instead of overriding
  `secondary`: `cn` is a plain joiner with no Tailwind conflict resolution.
- **`ConnectSign` is a bare anchor**, not a `BentoCard` — `BentoCard` is
  `overflow-hidden` and would clip the sign's outer glow.
- **Removed `zod`** (only the contact form used it).
- **Mockup file committed** in its own commit: the repo is public, but the photo
  it embeds was already tracked, and `.vercelignore` keeps `docs/` off the site.
- **Commit style:** branch first (default-branch rule), Conventional Commits, and
  **no `Co-Authored-By` trailer** — the owner's CLAUDE.md forbids it and outranks
  the harness's default attribution reminder.

## 4. What was built (committed, oldest → newest)

- `2ffce61 fix(hologram)` — the real bug fix (`resize={{ offsetSize: true }}`);
  a perspective-aware camera fit (`src/three/math/fitCamera.ts`, pure, with 27
  tests, one pinned to the mockup's measured camera) and shared dimensions
  (`src/three/sceneDims.ts`); the rebuilt projector beam (two striated cone
  shells fanning up from a hot emitter, drawn *behind* the card with
  `depthTest: false`, `renderOrder: -1`, `uGain = 0.4`); a wider emitter pool and
  white-hot core; bloom + halo sprites; portrait `focusX` 0.48 → 0.495.
- `9e1cf02 feat(theme)` — the deepened twilight tokens, a lit arc-blue top edge
  on every card (`BentoCard`), new tokens (`--stage-bg`, `--cv-*`, `--green*`,
  `--window-shadow`, `--tile-*`), the theme toggle on panel tokens, and the
  hand-synced contrast table recomputed against the new worst-case card.
- `e3fb1c2 feat(skills)` — 11 marks added. **Real logos for six** (Azure DevOps,
  OpenAI→Codex, Windows, React Navigation, Antigravity's mask silhouette; plus
  OpenCode and Cline, which were in `simple-icons@16` but unwired). **Four
  hand-drawn stand-ins, flagged `approximate`** (Zustand, PostGIS, Blynk, Groq).
  Registry now carries per-icon viewBox, stroke mode and fill rule
  (`src/features/skills/customIcons.ts`, `skillIcons.ts`, `SkillIcon.tsx`).
- `88d4780 fix(social)` — label taken out of flow, icon centred, lift-on-hover,
  the ellipsis rules deleted, hex 52 → 56px, retitled "Contact & Socials";
  touch devices keep the label visible with the icon lifted.
- `cc88e45 feat(layout)` — `ConnectSign`, centred "Download CV", the
  "Currently Active" pill, the new bio and "Open to" chips, the token-driven
  stage (`PassCard` restructured), the still arc-blue location dot, the contact
  form and dialog removed. Centre column is now **sign → stage → Download CV**.
- `cf932fa chore` — dropped `zod`, `.env.example`, the `api/**` ESLint glob, the
  README `api/` line, and reworded the `.vercelignore` comment.
- `16a3d0c docs` — `contracts.md` and the stale `Lanyard*` names in
  `vitest.config.ts`.
- `e3122fc test(e2e)` — visual baselines regenerated (inspected first).
- `24a4dfe docs(reference)` — the approved mockup.

Net: 63 files, +2606 / −2347 vs the session start (`f054969`).

## 5. Testing & verification

Everything below was actually run against the final tree:

- **Unit: 414 tests pass across 35 files** (453 / 34 at the start; the contact
  form's tests were removed and new ones added: `fitCamera`, `ConnectSign`,
  `skillIcons`, `SkillIcon`, and expanded `IntroCard`, `ActionsRow`, `App`).
- `typecheck` and `lint` clean.
- **e2e at one worker (as CI runs it): 83 passed, 24 skipped, 0 failed.** New
  specs: `centre-column.spec.ts`; hologram canvas-vs-container at three
  viewports; hexagon centring and un-truncated label.
- **The new regression test was mutation-tested.** With the fix temporarily
  removed it fails 3 of 4 (1366×768, 1280×720, "centred in the stage"); with the
  fix it passes. (Session 005's `webgl` guard was never proven this way.)
- **Fidelity diff, both themes: 59 of 61 boxes within 1px.** The two residuals
  are known: the theme toggle (kept live-size, above) and the Certifications
  card, which the mockup only hand-approximated (1.5px taller).
- **Light-theme contrast computed, not eyeballed:** primary 15.3, secondary 9.9,
  muted 6.8, eyebrow 8.8, chip 8.5, "Currently Active" 4.89 on the worst-case card.
- **Not verified:**
  - The **live** site *after* the production deploy — Vercel reported success,
    but the canvas measurement was not re-run against production (§6).
  - The hologram's look on a real GPU (headless software GL cannot judge it).
  - **Initial bundle size was not re-measured.** Session 005 left it ~2 kB over
    target; this session removed the contact dialog and `zod` but added ~10 KB of
    icon data and larger shader code.
  - Mobile was checked by eye only; it was never mocked. The project overlay in
    the new light theme was not visually reviewed.

### Findings worth keeping

1. **The item-3 bug was not what the first plan said.** The plan's initial
   diagnosis was framing arithmetic (camera clipping). Rendering the real app
   showed otherwise: r3f measures its container with `getBoundingClientRect()`,
   which **includes the window's `scale()` transform**, then writes that size
   back as CSS px — so the parent transform scales the canvas a *second* time
   (visible canvas = layout × s², anchored top-left). Measured on production
   *before* the fix: canvas ÷ container = **1.000 @1440×900, 0.935 @1366×768,
   0.873 @1280×720**. It is invisible whenever the window scale is 1, which is
   why it only showed on laptop-sized windows. Locally, after the fix: 1.000 at
   every viewport. **Lesson: render the real thing before trusting maths.**
2. **Perspective matters for framing.** The pedestal's near rim is ~1.9 units
   closer to the camera than its centre, so naive height/width maths
   under-frames it (an earlier estimate of 0.475 clearance ignored this). The fit
   projects real 3D points through the camera.
3. **The mockup had no Tailwind preflight**, so much of its text used
   `line-height: normal` while the app inherits 1.5. That produced every
   vertical delta in the geometry diff (chips 24px vs 17px, buttons, headings).
   Fixed with `leading-[normal]` / `leading-none` in the specific places, and by
   giving the `<li>` around each chip `display:flex` (a bare `li` opened a
   16px×1.5 line box). Card paddings and the 11.5px bio are also part of why the
   left column fits 770.
4. **Tailwind `bg-[var(--x)]` compiles to `background-color`.** A gradient token
   is invalid there, so the stage silently lost its navy bay (light) and soft
   glows (dark). Needs the `image:` hint. Only a screenshot caught it.
5. **`h-full` inside a `min-height`-only parent collapses to 0.** The stage
   rendered on desktop (definite flex height) and was *empty on mobile*. The
   wrapper now fills the already-positioned card (`absolute inset-0`).
6. **A `both`-fill entrance animation swallows hover transforms**
   (`bento-card-enter` ends at `transform: none`), so the sign's hover lift uses
   the individual `translate` property. The same animation also polluted my
   first measurements by 14px — disable animations before measuring rects.
7. **The plan review earned its keep:** it caught the stale claim that
   `src/three/**` is excluded from Vitest; that `contrast.ts` is a hand-synced
   table that the palette change invalidates; that deleting the contact form
   breaks two tests *at import time*; that `zod`, an ESLint glob, the README and
   `.vercelignore` were orphaned by it; and that the `webgl` CI project means the
   new canvas test must pass under swiftshader.
8. **The "Instagram" bug had a specific cause:** the label's
   `max-width: 88%; overflow: hidden; text-overflow: ellipsis`. Widening the hex
   alone would not have fixed it. The new test measures the *text* with a `Range`
   (the label box is always full-width, so a `scrollWidth` check passes trivially).
9. **Two parallel workers starve software WebGL:** a contended full-suite run
   timed out two `webgl` tests that passed alone (and at one worker). Those
   tests now carry a generous timeout budget.

### Tooling notes (this machine)

- `gh` is **still** not on either shell's PATH, and the **Vercel MCP returned
  403** for this team/project. Repo visibility, commit statuses and the
  preview/production deployment URLs were read from the **public GitHub API**
  instead; the Vercel CLI is not installed.
- The working tree is **CRLF** (`core.autocrlf=true`): scripted edits matching
  `\n` silently missed. Use `\r?\n` or the Edit tool. Git warns about LF→CRLF on
  new files; that is harmless.
- Long inline `node -e '…'` breaks on apostrophes; and naming a variable `URL`
  inside `node -e` shadows a global Node's own internals need and crashes it.
  Write scripts to a file in the scratchpad.
- Headless WebGL needs `--use-gl=angle --use-angle=swiftshader --enable-webgl
  --ignore-gpu-blocklist`. A throwaway dev server was run on `:5199` and stopped.

## 6. Deployment

Repo safety (per the owner's CLAUDE.md) was checked before committing: the repo
is **public** (anonymous GET returned 200), the portrait was already tracked in
`src/assets/`, and `.env.example` (only an empty `RESEND_API_KEY=`) was deleted
with the contact form.

The owner's instructions were followed step by step: "commit it" → nine commits
on `feat/portfolio-revamp`, **not pushed**; "push it so we can check" → pushed
the branch, Vercel built a **preview** (`success`); "push to main" →
`main` fast-forwarded `f054969 → 24a4dfe` and pushed. GitHub reports the
**Production** deployment `success`
(`https://mclector-1rzqfa1j4-myres-projects.vercel.app`). Vercel auto-deploys
production from `main`.

I did **not** fetch the live site after the deploy. The item-3 fix on production
is confirmed only by (a) Vercel's success status and (b) the identical local
measurements. The check that remains: open the live site at ~1366×768 or
1280×720 (or re-run the canvas ÷ container measurement) — it should read 1.000.

## 7. State at the end of this session

- **Branch:** `main` contains everything and matches `origin/main` (`24a4dfe`).
  `feat/portfolio-revamp` still exists locally and on origin, now redundant.
- **Verified clean:** `typecheck`, `lint`, `test` (414), `test:e2e` (83 passed,
  0 failed, 24 skipped by design) — see §5 for what was *not* verified.
- **Still owed by the owner:**
  - A live look on a real GPU in both themes, especially the new beam and the
    hologram at a laptop-sized window.
  - Real URLs for X, Instagram, YouTube and TikTok (still `#`; clicking one
    jumps the page to the top).
  - A real CV PDF (Download CV is a disabled placeholder).
  - Whether the four **approximated logos** (Zustand, PostGIS, Blynk, Groq —
    not the brands' real marks) should stay or become lettered tiles.
- **Known rough edges (deliberately deferred):**
  - `badge.subtitle` still reads "CS Student · Mobile Dev" (visible only on the
    no-WebGL fallback card) and contradicts the new bio.
  - The README still describes a "physics-driven lanyard badge" and Rapier.
  - The contrast table's hex values are hand-computed again and must be kept in
    sync by hand when a token changes.
  - Visual baselines exist only as `*-chromium-win32.png`, so CI on Linux has
    none to compare against (pre-existing).
  - Mobile layout and the project overlay in the new light theme have had no
    design review.
- **Superseded from session 005:** the fixed-560px hologram container / empty
  space above "Digital Pass" is gone (the stage is fluid); the "lazy-load
  `ContactDialog` and its zod schema" bundle lever is moot (both deleted).

## 8. Where things live, for reference

- The plan this session executed (session-scoped approval plan):
  `C:\Users\zanmo\.claude\plans\i-want-the-following-flickering-thompson.md`
- Visual/3D source of truth for this round:
  `docs/reference/2026-09-19-revamp-mockup.html` (older:
  `docs/reference/hologram-mockup.html`)
- Hologram: `src/three/HologramScene.tsx`, `HologramCanvas.tsx`,
  `sceneDims.ts`, `math/fitCamera.ts`
- Theme + budget: `src/styles/index.css`, `src/lib/contrast.ts`
- Connect sign: `src/features/connect/` · Download CV: `src/features/actions/`
- Stage: `src/features/pass/PassCard.tsx` · Layout: `src/layout/bento.css`
- Skill logos: `src/features/skills/customIcons.ts` (sources + licences in its
  header), `skillIcons.ts`, `SkillIcon.tsx`
- Hexes: `src/features/social/social.css`
- e2e: `e2e/` (new: `centre-column.spec.ts`; extended: `hologram.spec.ts`,
  `social.spec.ts`)
- Prior sessions: `docs/session/001–005-session-summary.md`; handoff:
  `docs/handoffs/001-hologram-redesign-handoff.md`
