# Frozen contracts — Phase 0 foundation

This file is the source of truth for every interface a parallel stream must
honor. Changing a signature here is a request to the integrator, not a
unilateral edit inside a stream's own files. See
`C:\Users\morad\.claude\plans\id-like-to-build-pure-lightning.md` for the
full architecture and rationale.

> **Note (design pass, 2026-09-19).** The "files no stream may edit" list below
> was a coordination device for the original *parallel* build — it stopped seven
> concurrent agents from colliding on the shared shell. It is **not** a permanent
> ban. A later single-agent visual overhaul intentionally revised the shell
> (`GradientBackdrop`, `App.tsx`, `BentoCard`, `bento.css`, `styles/index.css`)
> to add the inset "app window", the localized nebula glow, badge bloom, and card
> materials. The component *contracts* (props/areas/routing below) were preserved;
> only the look changed.

## Files no stream may edit

`src/content/**` (read-only after Phase 0) · `src/layout/BentoGrid.tsx` ·
`src/layout/bento.css` · `src/App.tsx` · `src/styles/index.css` ·
`src/components/ui/**` · `src/test/setup.ts` · `vitest.config.ts` ·
`playwright.config.ts` · `package.json` (no `npm install` inside a stream —
a new dependency is a request to the integrator).

## Content types

Frozen in `src/content/types.ts`: `Profile`, `Skill`, `Project`, `Social`,
`Certification`, `SiteContent`, `ImageRef`. Every card takes content as
props — never a deep import of `src/content/index.ts`.

## Component contracts

| Stream | Component | Signature | Owns |
|---|---|---|---|
| A | `IntroCard` | `{ profile: Profile }` | `src/features/intro/**` |
| A | `SkillsCard` | `{ skills: Skill[] }` | `src/features/skills/**` |
| A | `ActionsRow` | `{ profile: Profile }` | `src/features/actions/**` |
| B | `LocationCard` | `{ location: Profile["location"] }` | `src/features/location/**`, `src/lib/time.ts` |
| C | `PassCard` | `{ profile: Profile }` | `src/three/**`, `src/features/pass/**` |
| D | `SocialHex` | `{ socials: Social[] }` | `src/features/social/**`, `src/lib/hexNeighbors.ts` |
| E | `ProjectsCard` | `{ projects: Project[] }` | `src/features/projects/**` |
| E | `ProjectOverlay` | `{ projects: Project[] }` | `src/components/Overlay/**`, `src/lib/useHashRoute.ts`, `src/lib/useFocusTrap.ts` |
| G | `CertificationsCard` | `{ certifications: Certification[] }` | `src/features/certifications/**` |
| — | `ConnectSign` | `{ email: string }` | `src/features/connect/**` |

`ActionsRow` is just the centred Download CV control now — the "Contact me"
button and the contact form/dialog were removed (Stream F is retired). Contact
is `ConnectSign`: a neon link at the top of the centre column that opens Gmail's
compose window (`gmailComposeUrl`, `src/lib/contactUrl.ts`) in a new tab — not a
`mailto:`, which does nothing on a machine with no mail app registered. The Email
hexagon in `SocialHex` uses the same URL. `ConnectSign` is rendered as a bare
anchor, not a `BentoCard` (BentoCard is `overflow-hidden` and would clip its
glow).

## Routing contract

Project detail uses the URL hash: `#/project/:id`, where `:id` is a
`Project.id` slug (stable forever — see `src/content/projects.ts`). Owned
by Stream E (`src/lib/useHashRoute.ts`). An unknown slug renders the grid,
not an error.

## Grid areas

`grid-area` values, defined in `src/layout/bento.css`: `intro`, `skills`,
`pass`, `social`, `place`, `work`, `certifications`, `actions`, `connect`. A stream's
top-level component renders exactly one `<BentoCard area="...">` for that
value (`SkillsCard` and `ActionsRow` are their own cards, distinct from
`IntroCard`, despite both belonging to Stream A).

## Testing boundaries

`src/three/HologramScene.tsx` and `HologramCanvas.tsx` are WebGL code with no
jsdom counterpart and are not unit-tested; they are excluded from coverage in
`vitest.config.ts`. Everything else under `src/three/` IS tested by Vitest:
the pure maths (`src/three/math/**`, e.g. `fitCamera`), the scene dimensions
(`sceneDims.ts`), the texture helpers (`src/three/textures/**`) and
`BadgeFallback` (plain DOM/CSS). Write those tests first, then compose the
scene from tested units. The hologram's canvas mounting, sizing and centring
are covered by `e2e/hologram.spec.ts` (the `webgl` Playwright project); its
look is judged by eye on a real GPU.

## Hover and motion policy (round 3)

Two owner decisions that every component must respect. Both have guards that fail the build, so they cannot
regress quietly.

**Hover is locked on.** Every hover and focus transition works for every visitor, whatever the browser claims
about its pointer and whatever the OS or the site's Animations toggle says. Hover rules key off
`html[data-input="mouse"]` (`src/lib/inputMode.ts`, seeded by the inline script in `index.html`, then following
real pointer events), never a media query. Tailwind's `hover` variant is overridden to the same rule in
`styles/index.css`, so plain `hover:` and `group-hover:` follow it. Hand-written CSS uses
`:where(:root[data-input="mouse"]) …` to keep specificity unchanged. With no evidence of a mouse the safe default
is touch: the social hexagons show their names and nothing depends on hover. Do not put `@media (hover: …)` or
`(pointer: …)` back: a touchscreen laptop fails `(hover: hover) and (pointer: fine)` while a real mouse is attached,
which killed every hover effect there. Guards: `src/lib/hoverAndMotionPolicy.test.ts` (source),
`e2e/compiled-css.spec.ts` (built CSS), `e2e/no-hover-browser.spec.ts` (a browser that reports no hover).

**The OS `prefers-reduced-motion` setting is never read.** Ambient, decorative motion (starfield, falling code,
rocks, comet, parallax, the hologram's spin, the status ripple, entrance staggers, the project overlay's large
motion) runs by default for everyone and is governed only by the visible **Animations** toggle
(`src/lib/motion.ts`, `html[data-motion]`, persisted as `localStorage["mclector-motion"]`). Off freezes keyframe
animations and zeroes their delay; it never touches `transition-*`, which is what keeps hover locked on. Because the
default ignores the OS, the toggle is the only way out of ambient motion, so it stays visible, labelled and
keyboard-operable. Seeding the default from the OS later is a one-line change in `resolveInitialMotion`.
The e2e suite runs with the toggle OFF (`storageState` in `playwright.config.ts`), which keeps the visual baselines
and the hologram picture guards deterministic; specs that need the animated site opt out with an empty
`storageState`.

`ConnectSign` is a polished dark neon plate (a lit tube ring and one soft bloom, no screws, arrow or flicker),
exactly 42px tall so the hologram stage keeps its measured height. The centre column is sign → Download CV → stage.
