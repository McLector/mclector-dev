# mclector-dev

Myre Lector's interactive 3D web portfolio — a single-screen bento grid with
a physics-driven lanyard badge, built with Vite, React, react-three-fiber,
and Rapier.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit/component suite |
| `npm run test:e2e` | Playwright (builds + serves first) |

## Architecture

See `docs/contracts.md` for the frozen interface contracts each feature
stream must honor, and the design/implementation plan for the full
architecture, rationale, and parallelization map.

## Project structure

- `src/content/` — single source of truth for all site data (profile,
  projects, skills, socials, certifications). Cards take this data as
  props; nothing deep-imports it directly except `App.tsx`.
- `src/layout/` — the bento grid composition (`BentoGrid.tsx`, `bento.css`)
  and the CSS gradient backdrop.
- `src/features/*/` — one directory per bento card, each independently
  ownable.
- `src/three/` — the WebGL lanyard scene (excluded from the unit test
  suite; see `vitest.config.ts` and `docs/contracts.md`).
- `src/components/ui/` — shared visual primitives (`BentoCard`, `Chip`,
  `Button`, `Pill`).
- `e2e/` — Playwright specs.
