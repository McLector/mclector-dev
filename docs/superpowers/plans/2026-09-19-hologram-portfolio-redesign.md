# Hologram Portfolio Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the live portfolio into the approved "Hologram Deck" design — a single framed window that scales to fit one screen (no scroll), a 3D holographic ID-card display on a sci-fi projector pedestal (with the owner's real photo), an alive galaxy background, the full GitHub skill set with real logos + tooltips, honeycomb social links with arc-reactor hover glow, livelier subheaders, and a refined twilight light mode.

**Architecture:** Build on the current React 19 + Vite + Tailwind v4 + react-three-fiber site (already has a galaxy backdrop, `data-theme` theme system, grouped skill grid, seconds clock, honeycomb). Three structural changes: (1) wrap the bento in a fixed-size **framed window scaled to fit** the viewport on desktop (natural scroll on mobile); (2) **replace the lanyard/Rapier 3D** with a physics-free **hologram card + pedestal + beam** scene, and **decouple "render 3D" from "animate 3D"** so the object shows for anyone with WebGL (reduced-motion just freezes it); (3) upgrade the background, skills, social, and subheaders per the mockup. All new visuals are ported from the approved mockup, which is the pixel/parameter source of truth.

**Tech Stack:** React 19, TypeScript (strict), Vite 8, Tailwind v4, three.js + @react-three/fiber + @react-three/drei, @fontsource (Sora + Space Mono), simple-icons, Vitest + Testing Library, Playwright (+ axe). Node 22.

**Spec:** The approved interactive mockup — artifact `https://claude.ai/artifact/AHoYzfJrNjegBWPeYwkxpZ` (Version 5). Task 0.1 copies its source into `docs/reference/hologram-mockup.html` as the in-repo source of truth; every visual/3D task cites exact values from it (key values are also inlined below so this plan is self-contained).

## Global Constraints

- **Node 22.x**; do not change the engine floor.
- **No external runtime resources** except self-hosted `@fontsource` — no CDN scripts/fonts in the shipped app.
- **Initial JS bundle stays lazy for three.js**: all three.js/r3f code loads only through the existing `React.lazy` boundary; initial route ≤ ~155 kB gzip (current baseline). Confirm with `npm run build`.
- **`prefers-reduced-motion` safe**: every animation has a reduced variant; the 3D object still *renders* under reduced motion, it just stops autonomous motion (spin/float/beam-flicker/pedestal-rotation).
- **Both themes meet WCAG AA**: extend `src/lib/contrast.ts` budget for any new tokens; `contrast.test.ts` must pass for dark and twilight.
- **Accessibility**: keyboard-reachable controls, visible focus, `aria-*` intact; axe passes in both themes.
- **Commits**: Conventional Commits, imperative summary, body explains *why*. **No AI attribution / no `Co-Authored-By: Claude`.**
- **Verification is real**: a task is done only when its named command passes with shown output. The live WebGL 3D is verified with the owner on a real GPU (headless swiftshader cannot settle it reliably).
- **The owner's photo** (`portfolio content/portfolio-pic.jpg`, ~square) ships as a public asset (it is the hero portrait); it is cropped `cover` to the card's portrait aspect, subject biased center.

---

## File Structure

**Remove (no longer used):**
- `src/three/LanyardScene.tsx`, `src/three/LanyardCanvas.tsx` → replaced by hologram scene.
- `src/three/textures/badgeFaceTexture.ts` + `bandTexture.ts` + `createTextures.ts` + tests, `src/three/meshline.d.ts`, `src/three/math/dragPlane.ts` (+ test) — lanyard-specific.
- `src/features/pass/passThemes.ts` / `PassThemeSwitcher.tsx` (+ tests) — the pass-theme switcher is dropped (single object).
- Dependencies: `@react-three/rapier`, `meshline` (and `postprocessing`/`@react-three/postprocessing` only if bloom is not reused — see Task 3.6).

**Create:**
- `src/layout/useFitScale.ts` (+ `.test.ts`) — scale-to-fit math + hook.
- `src/layout/AppFrame.tsx` — the framed window wrapper (owns the scale transform).
- `src/layout/GalaxyBackdrop.tsx` is reworked; add `src/layout/galaxyCanvas.ts` (+ `.test.ts`) — pure factory for the data-rain/asteroid/comet field.
- `src/three/HologramScene.tsx`, `src/three/HologramCanvas.tsx` — the new scene + lazy canvas.
- `src/three/pedestal.ts`, `src/three/holoCard.ts` — pure builders returning `THREE.Group`s (unit-light, but keep them factored).
- `src/three/textures/portraitTexture.ts` (+ `.test.ts`) — loads the photo and produces the screen texture (cover-crop + fallback).
- `src/features/skills/SkillTooltip.tsx` — shared hover tooltip.
- `src/components/ui/Eyebrow.tsx` — the livelier subheader (lead dot + tint).
- `public/portfolio-pic.jpg` — the photo asset (moved from `portfolio content/`).

**Modify:**
- `src/App.tsx` — mount `AppFrame`.
- `src/layout/BentoGrid.tsx`, `src/layout/bento.css`, `src/styles/index.css` — framed layout, tokens, arc-reactor + twilight, subheader styles.
- `src/features/pass/PassCard.tsx`, `src/features/pass/useSceneCapability.ts`, `src/lib/capability.ts` (+ tests) — render-vs-animate decoupling; mount hologram.
- `src/three/BadgeFallback.tsx` — the no-WebGL 2D fallback (restyle to the hologram card look).
- `src/features/skills/SkillsCard.tsx`, `skillIcons.ts`, `src/content/skills.ts`, `src/content/types.ts` — full set, real logos, tooltips, smaller.
- `src/features/social/SocialHex.tsx`, `social.css`, `src/content/socials.ts` — arc-reactor glow, +placeholders.
- `src/features/location/LocationCard.tsx`, `src/features/actions/ActionsRow.tsx`, `src/features/certifications/CertificationsCard.tsx`, `src/features/projects/ProjectsCard.tsx`, `src/features/intro/IntroCard.tsx` — Eyebrow + arc-reactor accents, refit into frame.
- `src/content/profile.ts` — `avatar.src` = the photo.
- e2e specs + `visual.spec.ts` baselines — updated for the framed no-scroll layout.

---

## Phase 0 — Prep

### Task 0.1: Vendor the approved mockup + move the photo

**Files:**
- Create: `docs/reference/hologram-mockup.html`
- Create: `public/portfolio-pic.jpg`

- [ ] **Step 1:** Save the approved mockup source to `docs/reference/hologram-mockup.html` (from the artifact / scratchpad copy). This is the visual/3D source of truth executors read alongside this plan.
- [ ] **Step 2:** Copy `portfolio content/portfolio-pic.jpg` → `public/portfolio-pic.jpg`. Leave the original folder in place (gitignore it if the owner prefers; the public copy is what ships).
- [ ] **Step 3:** Confirm `.gitignore` does not exclude `public/`. Commit.

```bash
git add docs/reference/hologram-mockup.html public/portfolio-pic.jpg
git commit -m "chore(assets): vendor approved hologram mockup and portfolio photo"
```

### Task 0.2: Drop physics dependencies

**Files:** Modify: `package.json`; Remove: lanyard files listed in **File Structure**.

- [ ] **Step 1:** Delete the lanyard-only files (LanyardScene/Canvas, badge/band textures + tests, meshline.d.ts, math/dragPlane + test, pass switcher files + tests). Do **not** delete `PassCard.tsx`, `BadgeFallback.tsx`, `useSceneCapability.ts`, `capability.ts`, `useInView.ts`, `useDocumentVisible.ts`.
- [ ] **Step 2:** `npm uninstall @react-three/rapier meshline` (keep `three`, `@react-three/fiber`, `@react-three/drei`).
- [ ] **Step 3:** `npm run typecheck` — expect errors only from imports of the deleted files (fixed in Phase 3). Remove now-dead imports/exports that don't belong to Phase 3 targets.
- [ ] **Step 4:** Commit `chore(3d): remove lanyard/Rapier scene ahead of hologram rebuild`.

### Task 0.3: CONFIRM why the owner sees a flat card (de-risk before building the fix)

> **Why this exists:** the entire Phase 3.1 fix assumes the flat 2D card is caused by the capability gate treating **reduced-motion or a low GPU tier as "no 3D."** That is the most likely cause but it is **not confirmed** — the owner never said whether OS reduce-motion is on. Building the whole redesign on an unverified hypothesis is the biggest risk in this plan. Confirm the cause first; the fix is cheap to retarget, the rebuild is not.

- [ ] **Step 1:** Ask the owner to check **Windows → Settings → Accessibility → Visual effects → Animation effects** (on = reduce-motion). If **on**, the current gate (`resolveQualityTier` returns `unsupported` under `prefersReducedMotion`) fully explains the flat card, and Phase 3.1 is exactly the right fix.
- [ ] **Step 2:** If reduce-motion is **off**, diagnose the real cause before proceeding: on the live site, inspect the pass cell's `data-pass-fallback-reason` attribute (values: `no-webgl` / `reduced-motion` / `low-tier` / `offscreen` / `loading`) and the console for WebGL errors. `no-webgl` or `low-tier` → adjust Phase 3.1 accordingly; a runtime error → fix that first (the gate fix won't help).
- [ ] **Step 3:** Record the confirmed cause in this task before starting Phase 3. No commit (diagnostic only).

---

## Phase 1 — Framed window, scaled to fit (no scroll)

The desktop portfolio becomes a fixed-design panel (1200×730 logical) scaled as one unit to fit the viewport; mobile (< 860px) unscales into a natural scrolling stack. Mirrors the mockup's `.window` + `fit()`.

### Task 1.1: `useFitScale` — the scale math (TDD)

**Files:** Create `src/layout/useFitScale.ts`, `src/layout/useFitScale.test.ts`.

**Interfaces:**
- Produces: `computeFitScale(vw, vh, dw, dh, pad?): number` and `useFitScale(designW, designH): { scale, isMobile }`.

- [ ] **Step 1: Failing test** (`useFitScale.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { computeFitScale } from "./useFitScale";

describe("computeFitScale", () => {
  it("scales down to fit the limiting dimension", () => {
    // 1366x640 viewport, 1200x730 design, 48 padding → height limits
    expect(computeFitScale(1366, 640, 1200, 730, 48)).toBeCloseTo((640 - 48) / 730, 4);
  });
  it("never upscales past 1", () => {
    expect(computeFitScale(4000, 3000, 1200, 730, 48)).toBe(1);
  });
  it("uses the smaller of width/height ratios", () => {
    expect(computeFitScale(900, 2000, 1200, 730, 48)).toBeCloseTo((900 - 48) / 1200, 4);
  });
  it("is defensive against zero/negative viewport", () => {
    expect(computeFitScale(0, 0, 1200, 730, 48)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2:** Run `npx vitest run src/layout/useFitScale.test.ts` → FAIL.
- [ ] **Step 3: Implement:**

```ts
import { useEffect, useState } from "react";

export function computeFitScale(vw: number, vh: number, dw: number, dh: number, pad = 48): number {
  const availW = Math.max(1, vw - pad);
  const availH = Math.max(1, vh - pad);
  return Math.min(availW / dw, availH / dh, 1);
}

const MOBILE_MAX = 860;

export function useFitScale(designW: number, designH: number) {
  const read = () => {
    if (typeof window === "undefined") return { scale: 1, isMobile: false };
    const isMobile = window.innerWidth <= MOBILE_MAX;
    return { isMobile, scale: isMobile ? 1 : computeFitScale(window.innerWidth, window.innerHeight, designW, designH) };
  };
  const [state, setState] = useState(read);
  useEffect(() => {
    const onResize = () => setState(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designW, designH]);
  return state;
}
```

- [ ] **Step 4:** Run the test → PASS.
- [ ] **Step 5:** Commit `feat(layout): add fit-to-viewport scale hook`.

### Task 1.2: `AppFrame` window + frame CSS

**Files:** Create `src/layout/AppFrame.tsx`; Modify `src/App.tsx`, `src/styles/index.css` (frame tokens), `src/layout/bento.css`.

**Interfaces:** Consumes `useFitScale`. Produces `<AppFrame>{children}</AppFrame>` rendering the scaled `.window` (desktop) or a padded scroll container (mobile).

- [ ] **Step 1:** Implement `AppFrame`: a full-viewport `.fit` grid centering a `.window` (design size `1200×730`, `transform: scale(var)` from `useFitScale`, `transform-origin:center`), frosted `--panel` background, hairline `--panel-edge`, deep shadow (values from mockup `.window`). On `isMobile`, render children in a scrolling `.window--mobile` (full width, auto height, `transform:none`). Keep `role`/landmarks; the existing `<main>` stays.
- [ ] **Step 2:** Add frame tokens to `index.css` `:root`/theme blocks: `--panel`, `--panel-edge`, `--arc: #5ec8ff` (dark) / a slightly deeper blue for twilight, `--arc-soft`. Set `body { overflow:hidden }` on desktop (via the frame) and `overflow:auto` under the mobile breakpoint.
- [ ] **Step 3:** Rework `bento.css`: the grid becomes the window's interior — `grid-template-columns: 290px 1fr 300px` with the three rails at ≥ the desktop breakpoint; single column stacked on mobile. Rows content-sized; the center column hosts the 3D. (Card min-heights from mockup.)
- [ ] **Step 4:** Mount in `App.tsx`: `<GalaxyBackdrop/> <ThemeToggle/> <AppFrame><BentoGrid .../></AppFrame> <ProjectOverlay/> <ContactDialog/>`. **Critical: keep `ThemeToggle`, `ProjectOverlay` and `ContactDialog` OUTSIDE `AppFrame`** — overlays are portaled/fixed and must NOT inherit the window's `transform: scale` (a transformed ancestor would break their fixed positioning and shrink them). The toggle stays fixed top-right at full size, as in the mockup.
- [ ] **Step 5: Preserve the `data-bento-area` contract.** The rework changes CSS/columns only; every card keeps rendering its `data-bento-area` (intro, skills, pass, social, place, work, certifications, actions) exactly once so `App.test.tsx` (asserts all 8 areas) still passes. Center column = `pass`.
- [ ] **Step 6: Verify (visual):** `npm run dev`; screenshot desktop (1440×900 and 1366×640) + mobile (390×844). Confirm: everything fits with **no scroll** on desktop at 100% zoom, mobile scrolls, overlays open at full size and centered. `npm run typecheck && npm run lint && npx vitest run src/App.test.tsx`.
- [ ] **Step 7:** Commit `feat(layout): frame the portfolio in a scale-to-fit window`.

---

## Phase 2 — Alive galaxy background

Rework `GalaxyBackdrop` to the mockup: CSS star/nebula layers (kept) + a full-screen 2D canvas of **data-rain + asteroids + comets**, plus **mouse parallax** on the star/nebula layers. All reduced-motion-frozen.

### Task 2.1: Galaxy canvas field factory (TDD-light)

**Files:** Create `src/layout/galaxyCanvas.ts`, `src/layout/galaxyCanvas.test.ts`.

**Interfaces:** Produces `makeRainColumns(width, colW, len)`, `makeAsteroids(n, w, h)` — pure factories returning deterministic-shaped data (seedable via injected `rng`), unit-tested for counts/bounds. The draw loop consumes them.

- [ ] **Step 1: Failing test:** assert `makeAsteroids(11, 1440, 900)` returns 11 items each with `x,y,vx,vy,verts` and `x∈[0,1440]`; `makeRainColumns(1440, 22, 60)` returns `ceil(1440/22)` columns each with a 60-char `0/1` string. Inject `rng=()=>0.5` for determinism.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement the factories (logic from mockup `rock()` / `initRain()`, with `rng` param). **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(bg): add galaxy field factories`.

### Task 2.2: GalaxyBackdrop canvas + parallax

**Files:** Modify `src/layout/GalaxyBackdrop.tsx`, `src/styles/index.css` (keyframes, `--rain`, parallax `.par`).

- [ ] **Step 1:** Render `.stars`, `.neb`, a `<canvas>` field (z behind window), using the factories + the mockup's `bgdraw` loop (data-rain → asteroids → comet). DPR-aware sizing; theme-reactive `--rain` via a `MutationObserver` on `data-theme` (from mockup).
- [ ] **Step 2:** Parallax: on `pointermove`, translate `.stars`/`.neb` a few px (mockup values), guarded by a `matchMedia('(prefers-reduced-motion: reduce)')` check and only on the desktop frame.
- [ ] **Step 3:** Reduced-motion: freeze rain/asteroids/comet (no velocity), disable parallax.
- [ ] **Step 4: Verify:** dev screenshot — confirm drifting asteroids, occasional comet, faint binary rain, parallax on mouse move, and that it reads calm behind the cards. Confirm CPU is reasonable (cap counts).
- [ ] **Step 5:** Commit `feat(bg): alive galaxy — data-rain, asteroids, comets, parallax`.

---

## Phase 3 — Hologram card + pedestal (the centerpiece) and the render/animate fix

> **Porting note (read before writing any Task 3 code):** the mockup uses **three r128 from a CDN**; the app uses **three 0.186 via r3f**. Account for the differences: (a) **color management is ON by default in 0.186** (legacy-linear in r128), so emissive/additive glows will look brighter/different — feel-check and dial `emissiveIntensity`, additive opacities and `envMapIntensity` to match the mockup rather than copying values blindly; (b) encoding/colorspace API names differ (`sRGBEncoding`→`SRGBColorSpace`, `outputEncoding`→`outputColorSpace`) — the mockup avoided these, keep it that way or use the 0.186 names; (c) don't `new THREE.WebGLRenderer` yourself — r3f owns the renderer; get it via `useThree(s=>s.gl)` for the `PMREMGenerator`, or use drei `<Environment>` with the generated gradient texture for reflections; (d) `ExtrudeGeometry`, `MeshPhysicalMaterial`, `ShaderMaterial`, `CanvasTexture`, `EquirectangularReflectionMapping` all exist unchanged. **Static mode still allows drag** (user-initiated is fine under reduced motion): use `frameloop="demand"` + `invalidate()` on pointer-drag so a static hologram is still interactive without an idle render loop.

### Task 3.1: Capability — decouple "render 3D" from "animate 3D" (TDD)

**Files:** Modify `src/lib/capability.ts`, `src/lib/capability.test.ts`, `src/features/pass/useSceneCapability.ts` (+ test).

**Interfaces:** Produces `resolveSceneMode(signals): "full" | "static" | "fallback"` — `fallback` only when `!hasWebGL` or `gpuTier<=0`; `static` when `prefersReducedMotion` **or** low tier (render 3D, no autonomous motion); `full` otherwise. Replaces the old `resolveQualityTier`'s reduced-motion→unsupported behaviour.

- [ ] **Step 1: Failing test:**

```ts
import { resolveSceneMode } from "./capability";
const base = { hasWebGL: true, prefersReducedMotion: false, devicePixelRatio: 2, hardwareConcurrency: 8, deviceMemory: 8, gpuTier: 2 };
it("renders static (not fallback) under reduced motion", () => {
  expect(resolveSceneMode({ ...base, prefersReducedMotion: true })).toBe("static");
});
it("falls back only without WebGL or a usable GPU", () => {
  expect(resolveSceneMode({ ...base, hasWebGL: false })).toBe("fallback");
  expect(resolveSceneMode({ ...base, gpuTier: 0 })).toBe("fallback");
});
it("is full on a capable device", () => {
  expect(resolveSceneMode(base)).toBe("full");
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `resolveSceneMode` (keep `TierConfig` for DPR/antialias; `static` reuses `low`/`medium` config with an `animated:false` flag). **Step 4:** Run → PASS.
- [ ] **Step 5:** Update `useSceneCapability` to return `{ mode, config, dpr }`; update its test. Commit `fix(3d): render the 3D object under reduced motion instead of hiding it`.

> **This is the fix for the owner seeing a flat card** — reduced-motion / low-tier now render a *static* 3D hologram, not the 2D fallback.

### Task 3.2: Portrait texture loader (TDD)

**Files:** Create `src/three/textures/portraitTexture.ts`, `.test.ts`.

**Interfaces:** Produces `coverCropUV(imgW, imgH, targetAspect): { repeat:[x,y], offset:[x,y] }` (pure, tested) and `loadPortraitTexture(src, targetAspect, onReady)` (wraps `THREE.TextureLoader`, applies the cover-crop UV, sets `anisotropy`; falls back to a generated avatar canvas if the image fails).

- [ ] **Step 1: Failing test** for `coverCropUV`: a 2048×2021 image into a 0.8 aspect card crops horizontally (`repeat.x<1`, `offset.x>0`), subject-biased center; a tall image crops vertically. **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Implement `loadPortraitTexture`. Photo source — pick ONE consistently: either keep it in `public/` and load the runtime URL string `new THREE.TextureLoader().load("/portfolio-pic.jpg", …)`, OR move it to `src/assets/portfolio-pic.jpg` and `import portraitUrl from "@/assets/portfolio-pic.jpg"` (Vite-hashed) then load that URL. (Adjust the File-Structure/Task-0.1 destination to match the choice — do not reference `@/../public`.) Commit `feat(3d): portrait texture loader with cover-crop and fallback`.

### Task 3.3: Pedestal + card + beam builders

**Files:** Create `src/three/pedestal.ts`, `src/three/holoCard.ts`.

- [ ] **Step 1:** `buildPedestal(THREE, ARC): { group, dots, tick(t) }` — metallic plate (CylinderGeometry), emissive rim torus, 2 additive ring lines, 40-seg dashed ring, 18 pulsing rim dots, center glow disc; `tick` pulses the dots + rotates slowly. Values from mockup `-- pedestal --`.
- [ ] **Step 2:** `buildHoloCard(THREE, ARC, texture): { group, holo, edge, tick(t) }` — opaque back plane; recessed **holo screen** (ShaderMaterial: softened scanlines + diagonal glare, tint 0.2; **fragment uses the real photo texture**); slim **beveled metallic bezel** (ExtrudeGeometry rounded-rect + window hole, `MeshPhysicalMaterial` metalness .72/roughness .15/clearcoat 1/envMapIntensity 1.3); reflective **glass cover** (`MeshPhysicalMaterial` opacity .05/clearcoat 1); glowing edge LineLoop + 4 HUD corner brackets. Exact geometry/material params from mockup `-- the card --`.
- [ ] **Step 3:** Both are pure builders (no React); no test beyond "constructs without throwing" (add a jsdom smoke test with a minimal `THREE` stub only if cheap — otherwise rely on the scene smoke test in 3.5).
- [ ] **Step 4:** Commit `feat(3d): pedestal and holographic card builders`.

### Task 3.4: HologramScene + HologramCanvas

**Files:** Create `src/three/HologramScene.tsx`, `src/three/HologramCanvas.tsx`.

- [ ] **Step 1:** `HologramScene`: lights (ambient + key + cyan rim) + procedural PMREM environment (mockup `envTex`) for reflections; mounts pedestal + card + beam (cylinder + bright core); `useFrame` drives card auto-spin/float, beam flicker, edge pulse, pedestal tick — **all gated by an `animated` prop** (false in `static` mode → render once/hold pose). Drag-to-spin via pointer handlers on the canvas (mockup logic). Load the portrait via Task 3.2; while loading, show the fallback avatar texture.
- [ ] **Step 2:** `HologramCanvas`: the `<Canvas alpha camera fov 32 pos (0,.3,7.6)>` lazy boundary (mirrors old `LanyardCanvas` frameloop gating on `active`). Pass `animated`, `dpr`, `config`. **Keep `data-pass-variant="webgl"` on the wrapper div** (Task 3.5's test and the e2e/visual specs key off it).
- [ ] **Step 3:** Commit `feat(3d): hologram scene on a projector pedestal`.

### Task 3.5: Wire PassCard + restyle the 2D fallback

**Files:** Modify `src/features/pass/PassCard.tsx`, `src/three/BadgeFallback.tsx`, `PassCard.test.tsx`.

- [ ] **Step 1:** `PassCard` renders by `mode`: `fallback` → `<BadgeFallback>` (no WebGL); else `<HologramCanvas animated={mode==="full"} .../>` behind the in-view/visibility gates (reuse `useInView`, `useDocumentVisible`). Remove the pass-theme switcher usage.
- [ ] **Step 2:** Restyle `BadgeFallback` to a static 2D version of the hologram card (photo + slim frame + arc-reactor edge) so the no-WebGL path matches. Update its tests (drop lanyard-era assertions; keep "renders into pass area", "shows caption", "no-webgl reason").
- [ ] **Step 3:** Update `PassCard.test.tsx`: assert `fallback` mode shows the static badge; `full`/`static` mount the canvas host (jsdom has no GL, so assert the `data-pass-variant="webgl"` host renders when `mode!=="fallback"` and WebGL is stubbed present).
- [ ] **Step 4:** `npm run typecheck && npx vitest run src/features/pass src/three` → green. Commit `feat(pass): mount the hologram and fix the render gating`.

### Task 3.6: Bloom decision

- [ ] **Step 1:** Try the scene without postprocessing (the additive glows + emissive already read well). If glow is insufficient, re-add tier-gated `@react-three/postprocessing` Bloom (as before); otherwise `npm uninstall @react-three/postprocessing postprocessing` and update `capability.ts` (`bloom` flag) + its test. Commit accordingly.

---

## Phase 4 — Skills: full set, real logos, tooltips, smaller

### Task 4.1: Content — the complete GitHub skill set

**Files:** Modify `src/content/skills.ts`, `src/content/types.ts` (already has `icon?`), `src/content/content.test.ts`.

- [ ] **Step 1:** Replace `skills.ts` with the full GitHub set, grouped, each with `icon` slug where a brand mark exists (fallback letters otherwise): **Languages/Mobile** TypeScript, JavaScript, Python, C++, React Native(react), Expo, React Navigation(—); **Web/Data** Next.js(nextdotjs), Tailwind(tailwindcss), Zustand(—), shadcn/ui(shadcnui), Supabase, PostgreSQL, PostGIS(—); **Hardware/Design/PM** ESP32(espressif), Arduino, Blynk(—), Figma, Azure DevOps(—); **Tools/APIs** Git, Vercel, Render(render), Claude Code(anthropic), Codex(—), Antigravity(—), OpenCode(—), Cline CLI(—), Groq(—), Windows SAPI TTS(—). Add `render`/`anthropic` to the `SkillGroup` mapping if group names change (extend `SkillGroup` union + `GROUP_LABELS`).
- [ ] **Step 2:** Update `groupSkills.ts` `GROUP_ORDER`/`GROUP_LABELS` if adding groups (Design, PM, APIs). Update `groupSkills.test.ts`.
- [ ] **Step 3:** `content.test.ts` still passes (unique ids). Commit `content(skills): use the full GitHub skill & tool set`.

### Task 4.2: Icon registry + tooltip + smaller tiles

**Files:** Modify `src/features/skills/skillIcons.ts`, `SkillsCard.tsx`; Create `SkillTooltip.tsx`; update `SkillsCard.test.tsx`.

- [ ] **Step 1:** Extend `skillIcons.ts` named imports with `siRender`, `siAnthropic` (verify they exist in the installed simple-icons; fallback if not). Keep tree-shaken named imports only.
- [ ] **Step 2:** Rebuild `SkillsCard` tiles: smaller (`repeat(7,1fr)` grid, ~56% icon), crisper; on hover (hover-fine) lift + arc-reactor tint + show `SkillTooltip` (a single body-portaled label positioned from `getBoundingClientRect`, so it isn't clipped by the scaled window — mockup `#tt` logic). Keep every skill label as accessible text (`sr-only` or `aria-label`) so `getByText`/axe pass.
- [ ] **Step 3:** Update `SkillsCard.test.tsx`: all skills render, group headings present, tooltip label reachable, fallback initials for icon-less skills.
- [ ] **Step 4:** `npx vitest run src/features/skills` → green. Commit `feat(skills): real logos, smaller tiles, hover tooltips`.

---

## Phase 5 — Social honeycomb: arc-reactor glow + more links

**Files:** Modify `src/content/socials.ts`, `src/features/social/SocialHex.tsx`, `social.css`, `SocialHex.test.tsx`, `src/content/types.ts` (extend `SocialIconName` for tiktok if needed).

- [ ] **Step 1:** Add placeholder socials so the honeycomb reads full like the reference (target 6–7: keep real github/linkedin/email; add x, instagram, youtube, tiktok as `href:"#"` placeholders with a `// TODO: real URL` note). Extend `SocialIconName` + `SocialIcon.tsx` with any missing marks (x, tiktok).
- [ ] **Step 2:** `social.css`: on hover (hover-fine) the hex ignites **arc-reactor blue** — brightened fill + `filter: drop-shadow(0 0 8px var(--arc-soft)) drop-shadow(0 0 16px var(--arc-soft))` (works through the clip-path) + lift; 150ms `ease`; reduced-motion keeps the color, drops the lift. Keep the existing focus-ring sibling + mobile-visible labels.
- [ ] **Step 3:** Update `SocialHex.test.tsx` for the new count; e2e `social.spec.ts` already project-aware.
- [ ] **Step 4:** `npx vitest run src/features/social` → green. Commit `feat(social): arc-reactor hover glow and full link set`.

---

## Phase 6 — Subheaders, twilight theme, and card refits

### Task 6.1: Eyebrow component + livelier subheaders

**Files:** Create `src/components/ui/Eyebrow.tsx`; Modify each card to use it; `index.css` tokens.

- [ ] **Step 1:** `Eyebrow` = uppercase mono label with a glowing arc-reactor **lead dot** (`::before` or a span) + brighter cyan-tinted color (`color-mix(ink, --arc)`). Optional one-time load shimmer (reduced-motion off). Replace the raw `.eyebrow` usages in Intro/Skills/Location/Projects/Certifications/Social with `<Eyebrow>`.
- [ ] **Step 2:** Keep trailing counts (e.g. "4 featured") as a plain muted `.count` (no dot).
- [ ] **Step 3:** Commit `feat(ui): livelier subheaders with arc-reactor lead dot`.

### Task 6.2: Twilight light theme + arc-reactor accents across cards

**Files:** Modify `src/styles/index.css` (twilight token pass), `src/lib/contrast.ts` (+ test), the card components.

- [ ] **Step 1:** Refine the **twilight** (`:root` / light) palette per the mockup: softer aurora sky, readable dark-on-light glass, arc-reactor accents that hold on light. Redefine tokens under `@media (prefers-color-scheme: dark)` guarded `:not([data-theme="light"])` and `:root[data-theme="dark"]` (dark = deep space). Ensure `body`/frame backgrounds are explicit per theme.
- [ ] **Step 2:** Extend `contrast.ts` budget with any new fg/bg pairs (arc-tinted eyebrows on both grounds); update the sRGB hex approximations; `contrast.test.ts` passes for both themes.
- [ ] **Step 3:** Apply arc-reactor accents (status dot, focus rings, button/press) consistently; restyle Contact/CV as slim pills. **Preserve the existing Location card** exactly (seconds clock via `useLocalClock(tz, true)`, "Batangas, Philippines", "GMT+8 · Manila", animated status dot) — only refit it into the frame + Eyebrow; do not regress the clock.
- [ ] **Step 4: Theme the overlays.** `ProjectOverlay` is currently `bg-neutral-950/95` (dark in both themes) and `ContactDialog`/`Pill` still carry `white/x` literals — make them theme-aware so light mode isn't jarring (tokens, not literals). Both render via portal outside the scaled frame, so verify they open centered at full size in both themes.
- [ ] **Step 5: Verify:** dev screenshots in **both** themes (incl. an open project overlay + contact dialog); confirm twilight is genuinely good (the earlier dawn issue is resolved) and everything is legible. Commit `feat(theme): refine twilight mode and arc-reactor accents`.

---

## Phase 7 — Verification & deploy

- [ ] **Step 1:** `npm run typecheck` → clean.
- [ ] **Step 2:** `npm run lint` → clean.
- [ ] **Step 3:** `npm test` → all green (new/updated: `useFitScale`, `galaxyCanvas`, `resolveSceneMode`, `coverCropUV`, skills grouping, both-theme contrast). Fix until green.
- [ ] **Step 4:** `npm run build` → succeeds; confirm three.js stays in the lazy chunk and the **initial gzip didn't regress** past ~155 kB (dropping Rapier/meshline should *reduce* the lazy chunk).
- [ ] **Step 5:** `npm run test:e2e` — update the framed-layout expectations (the responsive spec now asserts **no-scroll at desktop** again, but fitting at 100% — invert the earlier "fluid scroll" assertion); regenerate the intentionally-changed `visual.spec.ts` baselines (badge/clock masked); axe passes in both themes.
- [ ] **Step 6: Live 3D check (with the owner):** deploy a preview (or run dev) and confirm on a **real GPU** that the hologram card renders with the photo, spins/drags, sits on the pedestal with the beam, and that reduced-motion shows a static (not flat-2D) hologram. This is the acceptance gate the headless environment cannot self-certify.
- [ ] **Step 7:** Commit remaining work; push `main` (auto-deploys to Vercel) **after the owner okays the live preview**. Verify the production URL serves the new build.

---

## Notes / risks

- **Photo tint balance:** keep the holo screen tint low (~0.2) so the face stays recognizable; the twilight photo already suits the palette. Feel-check live.
- **Scale-to-fit legibility:** on short laptops the window shrinks; confirm text stays readable at the smallest common desktop (1366×640 ≈ 0.84×). If too small, reduce the design height or allow the two dense lists (projects/certs) to scroll inside their cards.
- **Perf:** galaxy canvas + hologram + pedestal is a lot of motion; cap particle/rain counts, and the reduced-motion path must be genuinely quiet.
- **Social/cert content:** X/Instagram/YouTube/TikTok stay `#` placeholders (owner will supply real URLs); certifications stay "coming soon".
- **Photo asset:** prefer a Vite `import` (hashed, cached) over a bare `public/` path if the loader allows an URL string; either works. Optionally recompress the 270 kB JPG (it renders small on the card) — not required.
- **Overlays outside the scale transform:** `ThemeToggle`, `ProjectOverlay`, `ContactDialog` must stay siblings of `AppFrame`, never inside it (a transformed ancestor breaks `position:fixed`). Skill tooltips are body-portaled for the same reason.
- **Existing test surface:** many current unit tests assert today's structure (App areas, LocationCard clock, SkillsCard, PassCard, contrast, social count). Each phase updates its own tests; do not delete coverage wholesale. Expect the test count to move.
- **r128→0.186 gap:** the mockup's exact numeric values are a starting point, not gospel, because of three's color-management change — feel-check emissive/additive brightness after porting.
- **Confirm-before-build:** Task 0.3 must resolve *why* the flat card shows before Phase 3 is built; if it's not the capability gate, retarget the fix.
- **Self-review done:** every spec item across the whole session maps to a task — framed no-scroll (P1), scale-to-fit (1.1), alive galaxy/blinking stars (P2), pedestal+beam+card like the reference (3.3), real photo on the object (3.2), thin/slick frame (3.3), render-not-flat fix (3.1) + cause confirmation (0.3), full GitHub skills with real logos + hover tooltips (P4), honeycomb links + arc-reactor glow (P5), livelier subheaders (6.1), twilight light mode (6.2), seconds clock/Batangas/GMT+8 preserved (6.2), compact Contact/CV (6.2), certifications restored, overlays themed (6.2), unique fonts (already shipped; kept), bundle budget with Rapier dropped (P0/P7).
