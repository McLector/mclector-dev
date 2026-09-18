# Session 001 — Build and Deploy the 3D Bento Portfolio

**Date:** 2026-09-18
**Repo:** `C:\Project\portolio-projects\Portu-Folio`
**Final commit at session end:** `9973dd0` (master)
**Live URL:** https://portu-folio.vercel.app

This is a record of what happened in this session, not a task handover — there
is no pending work assigned here for a future session to pick up. It exists so
that anyone (human or model) landing in this repo later can understand *why*
the code looks the way it does without re-deriving the reasoning, and can see
exactly what was verified versus assumed.

---

## 1. What this project is

A personal, interactive web portfolio for **Myre Lector** (GitHub `@McLector`)
— a 4th-year CS student at De La Salle Lipa University, React Native &
TypeScript developer, open for internship. The site fills the
`Portfolio <!-- TODO: add portfolio URL -->` line in his GitHub profile
README.

The design target was a reference video in `Reference/` (gitignored, not
committed — a screen recording of the `aximoris` "Hello! I'm Max" site, built
in Spline): a **single-screen, no-scroll bento grid** on an animated gradient
backdrop, centred on a physics-driven **hanging lanyard ID badge**, with a hex
honeycomb of social links and a "Latest projects" list. The brief was to
rebuild that composition in real Three.js with Myre's own identity and
content — a close clone of the layout, not a copy of the brand.

## 2. How the session was structured

1. **Brainstorming** (architectural path per the `superpowers:brainstorming`
   skill) — read the reference video frame-by-frame via `ffmpeg` contact
   sheets, pulled the real GitHub profile and repo list via `gh api`, then a
   round of `AskUserQuestion` calls settled fidelity, stack, routing,
   responsive behaviour, and v1 scope.
2. **Plan mode** — a `Plan` subagent produced a fully version-verified
   technical architecture (checked every package version against the live npm
   registry rather than trusting training data), including a **parallelization
   map**: which work could run as independent subagents in git worktrees, and
   which files each stream would exclusively own.
3. **Phase 0 (serial foundation)** — built personally, not delegated: the
   Vite/React/TypeScript/Tailwind scaffold, the content data model, the bento
   grid layout, shared UI primitives, and `docs/contracts.md` — the frozen
   interface contracts every parallel stream had to honour.
4. **Phase 1 (parallel streams)** — seven independent feature streams, each
   dispatched as a background subagent working in its own `git worktree`,
   reviewed and merged one at a time.
5. **Phase 2 (integration)** — cross-stream bugs found during merge review,
   fixed by the orchestrator directly.
6. **Deployment** — Vercel CLI, preview then production, with two real
   deploy-time bugs found and fixed.
7. **Custom domain** — investigated and deliberately parked (see §7).

## 3. Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Fidelity to reference | Close clone of the layout; own content/palette/identity |
| Identity | Headline "Hello! / I'm Myre Lector", handle `@McLector`, Batangas PH clock |
| Stack | Vite + React 19 + TypeScript + react-three-fiber + drei + @react-three/rapier + Tailwind v4 |
| Project click | In-place detail overlay (row morphs into detail card), deep-linkable via URL hash |
| Responsive | Below 1024px reflows to a vertical stack; 3D stays at reduced DPR; static fallback on weak devices / `prefers-reduced-motion` |
| Featured projects | Eiyu-System, TaskBuddy, StarkRent, ESP32 Study Monitor (others overlay-reachable only) |
| Certifications | Data-driven card shipped **empty** with a designed "coming soon" state |
| Assets | **None on hand** at the time — no photo, no CV PDF, no screenshots. Everything renders from placeholders swappable by editing one content module |
| CV button | Coded and styled but **flag-gated off** (`profile.cv.available: false`) until a real PDF exists |
| v1 extras | Live local-time card; working contact form (serverless); Vercel deploy |
| Testing | TDD throughout — tests written before implementation, edge/negative cases required, not just happy paths |
| Orchestration | Foundation built personally; then subagent streams in git worktrees, reviewed and merged one at a time |

## 4. Architecture as actually built

### Dependency pins that mattered

- **React pinned to exactly `19.2.8`** — `@react-three/fiber@9.7.0` declares
  `react: ">=19 <19.3"`, and `npm create vite` would have installed `19.3.0`
  and broken the very first install. An npm `overrides` block enforces it.
- **`@dimforge/rapier3d-compat`** (pulled in by `@react-three/rapier`) inlines
  its WASM as base64 — no Vite WASM plugin was needed. The cost is bundle
  size, which is why the whole 3D tree is lazy-loaded.
- **TypeScript pinned to `~5.9.3`**, not the newer 7.x native/Go port, to
  avoid debugging an unfamiliar compiler mid-build.
- Tailwind v4 via `@tailwindcss/vite` — no `tailwind.config.js`, no
  `postcss.config.js`, tokens live in `src/styles/index.css` under `@theme`.

### The lanyard badge (`src/three/`)

Fully procedural — no `.glb` model, no downloaded textures, because none were
available. Every mesh is a primitive; every texture (the badge face, the
strap) is painted at runtime onto a `CanvasTexture` from `content/profile.ts`,
so the badge updates the moment the content module changes.

- **Rigid-body chain**: a `fixed` anchor → three dynamic joint bodies linked
  by `useRopeJoint` → the card body linked by `useSphericalJoint` anchored at
  the card's *top edge* (not its centre), which is what makes it hang and
  swing rather than pivot in place.
- **A real physics bug was found and fixed during the build**: the joint-held
  bodies' colliders were geometrically overlapping (the last rope segment's
  `BallCollider` sits permanently inside the card's `CuboidCollider`), which
  pumped energy into the chain every solver step and meant the badge never
  settled. Fixed with a no-collision `interactionGroups` on every lanyard
  body — the chain is joint-driven and was never meant to self-collide.
- **A UV-mapping bug was found and fixed**: drei's `RoundedBox` is an
  `ExtrudeGeometry` whose front-face UVs are in shape units, not normalised
  0–1, so mapping the badge texture directly onto it squashed the artwork
  into one corner. The printed face is a separate `planeGeometry` sitting a
  hair proud of the (unmapped) plastic body instead.
- **Deterministic `?e2e=1` mode** (`src/three/e2eMode.ts`) freezes the scene
  on an analytically-computed canonical rest pose after physics settles, for
  non-flaky visual regression screenshots. Getting this genuinely
  pixel-identical across runs took several real fixes (documented in the
  file): snapping the anti-jitter lerp, requiring rest velocity to *stay* low
  rather than just touch zero (a pendulum crosses zero velocity at every
  swing peak), and overwriting the pose analytically rather than trusting
  `<Physics paused>` (which skips the body→mesh sync entirely).
- **Capability tiering** (`src/lib/capability.ts`, Phase 0) resolves a
  `low | medium | high | unsupported` tier from WebGL availability, GPU tier
  (via drei's `useDetectGPU`), reduced-motion, core count, and device memory.
  Below `unsupported`, or with no WebGL, or under reduced motion, a single
  `BadgeFallback` component (plain DOM/CSS) renders instead — the same
  component serves all of those cases so it cannot rot out of sync with the
  3D version.
- **Code-splitting confirmed, not assumed**: the entire `three`/`drei`/Rapier
  tree sits behind `React.lazy` + an `IntersectionObserver`, verified by
  inspecting the actual `dist/assets/` output — the 3D chunk (~1.1 MB gzip,
  dominated by inlined Rapier WASM) never appears in the initial page's
  script references.

### Content layer (`src/content/`)

A single frozen `SiteContent` type (`profile`, `skills`, `projects`,
`socials`, `certifications`). Every card takes its data **as props**, never
by deep-importing the content module directly — `App.tsx` is the only reader.
This is what let every parallel stream test against fixtures (empty arrays,
120-character titles, missing images) without touching real data, and what
makes every future asset swap (a real photo, a CV PDF, project screenshots)
a one-line edit in `src/content/*.ts` rather than a component change.

`ImageRef` carries an optional `src` plus a `placeholder` gradient/monogram
descriptor, so a missing asset is a designed render state, never a broken
`<img>`.

### Layout (`src/layout/`)

One WebGL canvas, scoped to the centre bento cell — not full-bleed behind the
whole page. A full-bleed canvas would have had to choose between eating every
click (breaking the DOM cards) or ignoring pointer events entirely (killing
the badge drag, the whole point of the centrepiece). The gradient backdrop is
CSS, not WebGL, for the same reason plus cost: cheaper, GPU-composited,
trivially frozen under reduced motion.

Desktop (≥1024px) locks to `height: 100dvh; overflow: hidden` — the
"no-scroll" promise from the reference — and deliberately releases that lock
below 1024px and under short viewports (`max-height: 720px`), because forcing
no-scroll on a phone or a laptop makes a portfolio unusable rather than
impressive.

### Project overlay & routing (`src/lib/useHashRoute.ts`, `src/components/Overlay/`)

Project detail is routed through the URL fragment: `#/project/:id`. No router
dependency. This makes a project deep-linkable (paste `#/project/eiyu-system`
into an internship application email and it opens directly on load — verified
live in the browser during this session), Back-button-closeable, and
refresh-safe. The hash-parsing module deliberately knows nothing about real
content (it only answers "what slug is in the address bar"); `ProjectOverlay`
is what validates the slug against the actual project list, so an unknown or
hand-edited slug renders the grid, never a broken dialog.

### Contact form (`src/features/contact/`, `api/contact.ts`, `src/lib/contactSchema.ts`)

A Vercel Function written as a Web-standard Fetch handler
(`export async function POST(request: Request): Promise<Response>`) rather
than against an SDK — no `@vercel/node` dependency, and directly testable
with a real `Request` in and a real `Response` out. One `zod` schema is
imported by both the client form and the server handler so they can never
disagree about what's valid.

Layered, cheap spam defence: a honeypot field and a >4-link heuristic are
dropped **silently** (a bot that gets a 200 learns nothing); a time-trap
(submitted under 3 seconds, or over 30 minutes, since the form opened) and a
best-effort per-IP in-memory rate limit both answer 429. A subtle interaction
was caught and fixed: the rate limit check runs *after* the honeypot/time-trap
checks, so a flood of obviously-spam submissions doesn't burn a real
visitor's rate-limit budget.

With `RESEND_API_KEY` unset (its actual state at the end of this session),
the endpoint honestly returns `503 not-configured` and the dialog reveals a
`mailto:` fallback rather than silently losing the message or throwing an
opaque 500 — this was a deliberate design choice because the site was known
to be deploying before a Resend account would exist.

### Testing strategy

TDD was enforced throughout, with an explicit split on what's actually
testable for 3D work:

- **Pure functions** (time formatting, the contact schema, hash-route
  parsing, hex-grid neighbour geometry, the capability-tier resolver, the
  badge texture painter, the drag-plane projector, a WCAG contrast checker)
  were written test-first and are the bulk of the 440 unit tests.
- **Components** render from fixtures and are tested at their edge states —
  zero items, one item, many items — not just the happy path.
- **Simulated physics is never asserted in a unit test.** `src/three/`'s
  scene files (`LanyardScene.tsx`, `LanyardCanvas.tsx`) have no jsdom test
  counterpart; jsdom's `getContext('webgl2')` returning `null` is itself
  treated as a tested behaviour (it's what makes the static fallback the
  default in tests). One integration bug from this split is recorded in §6.
- **Playwright** covers smoke, deep-linking, the contact form's five response
  shapes (200/400/429/503/500, each mocked via `page.route`), responsive
  layout at 390px and 1440px, `prefers-reduced-motion`, axe accessibility
  (zero serious/critical violations, verified with **zero violations at any
  impact level**, not just serious/critical), and two visual regression
  baselines.

## 5. The parallel build (Phase 1)

Built with **git worktrees** — one per stream, each an isolated working copy
sharing the same `.git` object store, so no two agents could interleave
writes to the same files. Every dependency was installed once in Phase 0;
streams were explicitly forbidden from running `npm install`, which is what
kept `package.json`/`package-lock.json` from becoming a merge conflict
minefield across seven concurrent agents.

Streams ran in two waves. **Wave 1** (dispatched together): A, B, D, G.
**Wave 2** (dispatched after wave 1 was merged): E, F, C — C last, because it
was the largest and most likely to need perf-driven adjustments to its
neighbours.

| Stream | Scope | Landed as |
|---|---|---|
| **A** | Intro/headline, skills chips, Contact/CV action row | `feat(intro): implement intro, skills, and actions cards` (`22796c6`) |
| **B** | Live local-time card (Batangas, PH / `Asia/Manila`) | `feat(location): implement live local-time card` (`3aee62a`) |
| **C** | The 3D lanyard badge — the largest stream | `feat(pass): implement the procedural 3D lanyard badge` (`8f142ef`) |
| **D** | Hex honeycomb social grid, keyboard-navigable | `feat(social): implement hex honeycomb social grid` (`187ae72`) |
| **E** | Projects list, detail overlay, `#/project/:id` hash routing | `feat(projects): implement projects list, detail overlay, and hash routing` (`6f754b5`) |
| **F** | Contact form + serverless endpoint | `feat(contact): implement contact form and serverless endpoint` (`848b4f8`) |
| **G** | Certifications empty state + the a11y/visual regression harness | `feat(certifications): implement certifications card and a11y/visual harness` (`0df81af`) |

Every stream's report was reviewed against its actual diff (not taken on
faith) before merging, and each merge was followed by a full
`typecheck && lint && test && build` re-run on `master`.

**Stream C hit the session's model rate limit mid-run** (a background subagent
API call failed with a 429 shortly before it was going to run its
verification suite). It had already produced ~2,900 lines of implementation
and tests, uncommitted. Rather than restart from scratch, the same agent was
resumed via `SendMessage` with its saved context intact, and it completed
verification and committed normally once the limit reset.

## 6. Integration bugs found and fixed by the orchestrator

These were not part of any single stream's brief — they only became visible
once multiple streams' work coexisted, which is exactly the kind of thing an
integration pass exists to catch.

1. **`Button` had no way to render a real `<a href>`.** Stream A's CV link
   needed a genuine anchor (a `<button>` cannot semantically be a
   navigation), so it duplicated `Button`'s class string by hand — which
   would have silently drifted the next time the button styling changed.
   Fixed by extracting `buttonClasses()` from `src/components/ui/Button.tsx`
   as a shared export.
2. **Every git worktree's Playwright config shared the same preview port
   (4173).** With `reuseExistingServer: true`, a test run in one worktree
   could silently attach to a *different* worktree's already-running preview
   server and test the wrong code with no error — caught because Stream D's
   own e2e run flaked in exactly this way. Fixed by hashing the working
   directory into the port number in `playwright.config.ts`, so every
   worktree gets its own stable, collision-free port automatically.
3. **72 real tests were silently excluded from `npm test`.** Stream C put its
   pure, well-tested math/texture helpers inside `src/three/`, and the root
   `vitest.config.ts` blanket-excluded that entire directory on the
   assumption that only untestable simulation code lived there. Nothing
   under `src/three/` actually needed excluding — the R3F/Rapier scene files
   have no jsdom test counterpart to begin with — so the exclude was removed
   entirely rather than narrowed, and Stream C's own scoped workaround config
   (`src/three/vitest.three.config.ts`) was deleted once the root config
   covered it.
4. **The live clock made visual regression baselines non-deterministic.**
   Stream G's visual spec masked the 3D badge area out of its screenshot
   diffs (anticipating Stream C's physics landing later) but not the
   location card's ticking clock, because `LocationCard` was still a static
   Phase-0 placeholder when that mask list was written. Fixed by adding the
   `place` grid area to the masked regions; verified deterministic across
   three consecutive re-runs before trusting it.
5. **Bundle budget overage, flagged but not fixed.** The plan's target was
   under 120 kB gzip for the always-loaded bundle, excluding the lazy 3D
   chunk. After Streams E and F landed (`motion` for the overlay's
   shared-layout animation, `zod` for the contact schema), the real number is
   **140.29 kB gzip**. The 3D chunk itself is correctly split out
   (~1.1 MB gzip, loaded only when the badge scrolls into view on a capable
   device) — this overage is in the *always-loaded* portion. Lazy-loading
   `ProjectOverlay` and `ContactDialog` (neither is needed on first paint)
   would likely close most of the gap, but this was deliberately left
   unfixed rather than rushed, since `ProjectsCard`'s shared `layoutId`
   animation depends on `ProjectOverlay` being mounted with a matching id at
   the right time, and changing that needs its own verification pass.

## 7. Deployment

Deployed via the Vercel CLI (`npx vercel`, since the CLI is a devDependency
but wasn't installed globally). Linked as `myres-projects/portu-folio`.

**CLI login required a detour.** The CLI (initially v42, later upgraded by
the user to v59.23.1) had switched to an OAuth 2.0 Device Flow login — a
static "pick a provider" prompt that doesn't forward keystrokes correctly
through the `!`-prefixed chat-relayed shell. The working path was letting the
background `vercel login` process print its device URL + code
(`https://vercel.com/oauth/device?user_code=...`), which the user then opened
and approved in their own browser while the CLI polled to completion.

**Two real deploy-time bugs, found and fixed before production:**

1. `vercel.json`'s `functions.runtime: "nodejs22.x"` is not a valid
   third-party runtime identifier (that field is for custom runtimes like
   `vercel-php@0.6.0`) — it broke the very first build with `Function
   Runtimes must have a valid version`. Removed entirely; Vercel
   auto-detects `api/contact.ts` as a standard Node function, and the Node
   version is now pinned via `package.json`'s `engines` field instead.
2. **`api/contact.test.ts` was deploying as a live public route** at
   `/api/contact.test`. Vercel's zero-config Functions feature turns *every*
   file directly under `/api` into its own HTTP endpoint, with no exemption
   for test files — confirmed by running `vercel build` locally and finding
   a `.vercel/output/functions/api/contact.test.func` sitting right next to
   the real one. Fixed with a `.vercelignore` excluding `**/*.test.ts` (and
   a few build-irrelevant directories) from the upload; re-verified locally
   that only `contact.func` remained before redeploying.

**Verification performed, not assumed:** after each deploy, the preview and
then the production URL were driven directly — `fetch('/api/contact', ...)`
confirmed a real `400` with field errors on an empty payload,
`fetch('/api/contact.test')` confirmed a `404`, and the running site was
opened in an actual browser tab (desktop and mobile viewport) to click
through the project overlay, the contact dialog, and the mobile stacked
layout. The browser used to verify has `prefers-reduced-motion` enabled at
the OS/browser level, which meant the live check exercised the
`BadgeFallback` path rather than the WebGL canvas — confirmed via
`window.matchMedia('(prefers-reduced-motion: reduce)').matches === true`
rather than assumed, and treated as the fallback correctly doing its job,
not a bug.

**Custom domain (`mclector.dev`) was investigated and deliberately parked, not
configured.** The user believed this was their free domain from the GitHub
Student Developer Pack's Namecheap offer; it is not — that offer is a free
`.me` domain specifically. A `.dev` domain is covered by a *separate* offer
in the same pack, through Name.com. Both of the user's accounts were checked
directly (not assumed): Namecheap showed `mclector.dev` as
"with another registrar" (unmanageable from that account), and a newly
created Name.com account showed zero domains. `mclector.dev` was confirmed
never registered anywhere. It's available at Name.com for $14.99/first year
through *direct* signup, or should be $0 for the first year through the
proper GitHub-linked redemption flow (not yet attempted). The user chose to
stop here and keep `portu-folio.vercel.app` for now; nothing was purchased,
and the domain was removed from the Vercel project again after being
attached mid-investigation, so the project's domain list is clean.

## 8. State at the end of this session

- **Live production URL**: https://portu-folio.vercel.app
- **Repo**: 18 commits on `master`, clean working tree, all seven feature
  branches (`stream-a-intro` through `stream-g-certifications`) merged and
  still present as local branches (not deleted, not pushed anywhere — there
  is no git remote configured for this repo at all)
- **Verification last run clean**: `npm run typecheck`, `npm run lint`,
  `npm test` (440 tests), `npm run build`, and the full Playwright suite
- **Known, deliberately unaddressed items**:
  - Main bundle at 140.29 kB gzip vs. the 120 kB target (see §6.5)
  - `RESEND_API_KEY` not set — contact form works correctly, in its
    designed fallback mode
  - No custom domain attached (see §7)
  - No CI has actually run yet (the GitHub Actions workflow exists at
    `.github/workflows/ci.yml` from Phase 0, but there's no git remote for
    it to trigger against)
  - The `Portfolio` TODO in the GitHub profile README has not been updated
    with the live URL

## 9. Where things live, for reference

- Architecture/plan (written during brainstorming, still accurate):
  `C:\Users\morad\.claude\plans\id-like-to-build-pure-lightning.md`
- Frozen interface contracts for the parallel streams:
  `docs/contracts.md`
- This file's own index, if one gets started: `docs/session/`
