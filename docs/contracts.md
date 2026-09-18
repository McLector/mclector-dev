# Frozen contracts — Phase 0 foundation

This file is the source of truth for every interface a parallel stream must
honor. Changing a signature here is a request to the integrator, not a
unilateral edit inside a stream's own files. See
`C:\Users\morad\.claude\plans\id-like-to-build-pure-lightning.md` for the
full architecture and rationale.

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
| A | `ActionsRow` | `{ profile: Profile; onContact: () => void }` | `src/features/actions/**` |
| B | `LocationCard` | `{ location: Profile["location"] }` | `src/features/location/**`, `src/lib/time.ts` |
| C | `PassCard` | `{ profile: Profile }` | `src/three/**`, `src/features/pass/**` |
| D | `SocialHex` | `{ socials: Social[] }` | `src/features/social/**`, `src/lib/hexNeighbors.ts` |
| E | `ProjectsCard` | `{ projects: Project[] }` | `src/features/projects/**` |
| E | `ProjectOverlay` | `{ projects: Project[] }` | `src/components/Overlay/**`, `src/lib/useHashRoute.ts`, `src/lib/useFocusTrap.ts` |
| F | `ContactDialog` | `{ open: boolean; onClose: () => void }` | `src/features/contact/**`, `api/contact.ts`, `src/lib/contactSchema.ts` |
| G | `CertificationsCard` | `{ certifications: Certification[] }` | `src/features/certifications/**` |

`ActionsRow`'s `onContact` is the only outward call from Stream A — it does
not implement the contact form. `App.tsx` wires it to `ContactDialog`'s
`open` state.

## Routing contract

Project detail uses the URL hash: `#/project/:id`, where `:id` is a
`Project.id` slug (stable forever — see `src/content/projects.ts`). Owned
by Stream E (`src/lib/useHashRoute.ts`). An unknown slug renders the grid,
not an error.

## Grid areas

`grid-area` values, defined in `src/layout/bento.css`: `intro`, `skills`,
`pass`, `social`, `place`, `work`, `certifications`, `actions`. A stream's
top-level component renders exactly one `<BentoCard area="...">` for that
value (`SkillsCard` and `ActionsRow` are their own cards, distinct from
`IntroCard`, despite both belonging to Stream A).

## Contact form request/response shape (Stream F)

Request (`POST /api/contact`, JSON): `{ name, email, message, company,
startedAt }` — `company` is a honeypot (must arrive empty), `startedAt` is
a client timestamp (ms) used for the time-trap spam check.

Responses:
- `200 { ok: true }`
- `400 { ok: false, errors: Record<string, string> }` — per-field
- `429 { ok: false, reason: 'rate-limited' }`
- `503 { ok: false, reason: 'not-configured' }` — `RESEND_API_KEY` unset;
  UI must reveal a `mailto:` fallback
- `500 { ok: false, reason: 'server-error' }`

`src/lib/contactSchema.ts` exports one zod schema imported by both the
client form and `api/contact.ts` so they can never disagree.

## Testing boundaries

`src/three/**` is excluded from the Vitest jsdom suite (see
`vitest.config.ts`). Its pure math/texture helpers (e.g.
`src/three/math/dragPlane.ts`, `src/three/textures/badgeFaceTexture.ts`)
live inside that tree but are still unit-testable in isolation — write
their tests first, then compose the scene from tested units. Do not attempt
to assert simulated physics behavior in a unit test.
