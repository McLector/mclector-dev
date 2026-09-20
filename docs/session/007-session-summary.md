# Session 007 — Round 2: Real Colour, a Two-Sided Card, and Six UI Fixes (mockup-first)

**Date:** 2026-09-20
**Repo:** `D:\Projects\mclector-dev` — https://github.com/McLector/mclector-dev
**Work branch:** `feat/round-2-hologram-polish` (from `main` at `31ba5d6`). **Nothing is committed or pushed** — the owner
has not yet said to.
**Live URL:** https://mclector-dev.vercel.app (still the session-006 build)

Like sessions 001–006, this records *what happened and why*, not a task handover. Session 006 shipped the revamp; this
session is the owner's second round of feedback, done as **plan → mockup → approval → port → prove → (ship, not yet)**.

---

## 1. What this session was

The owner sent seven changes:

1. Make the projected picture on the hologram more distinct — show more of the photo's real colours.
2. Put the formal photo on the *back* of the hologram card (two pictures back to back).
3. "Let's Connect" was clickable but led nowhere useful — make it open Gmail with a new message to them, or stop it looking clickable.
4. Centre the time/location card's content.
5. Replace the YouTube hexagon with Upwork.
6. Make "Open to internships…" in the bio more noticeable.
7. Improve the floating card's border/design.

## 2. How the session was structured

1. **Plan mode, three review rounds.** The owner sent the plan back three times ("check again", "review one last time", "last full
   check") before approving; each pass found real errors (see §5). Decisions taken with the owner up front: Gmail compose in a new
   tab; Upwork URL as a placeholder; cut the background off the formal photo; refine (not redesign) the frame.
2. **Mockup** (`docs/reference/2026-09-20-revamp-round-2-mockup.html`), built from the approved 2026-09-19 mockup by a build script
   whose every replacement must match *exactly once*. It carries a review panel (colour blend, saturation, lift, scanline density /
   depth, fringe, contrast, spotlight, card angle, back-face crop, location centring, three "Open to" treatments, frame glow,
   double stroke, glint) — none of which ships. The owner approved its **default state exactly as it was**.
3. **A second plan** for the port, reviewed three more times. It defined "the same exact output" as *proved*, not eyeballed.
4. **Port, tests first** — write the failing test, watch it fail for the right reason, implement, watch it pass.
5. **Fidelity proof** (§4): the app's canvas and cards diffed against the mockup, pixel by pixel.

## 3. Decisions

| Decision | Choice |
|---|---|
| Email link | **Gmail compose in a new tab** (`https://mail.google.com/mail/?view=cm&fs=1&to=…`), on the sign *and* the Email hexagon. |
| Upwork URL | **`#` placeholder**, like X / Instagram / TikTok, until the owner supplies it. |
| Back face | **Background removed** — a floating bust. The formal photo has *no* transparency (§5), so the cutout was made. |
| Frame | **Refined, not redesigned**: lit steel bezel, double-stroke rim and brackets, a small travelling glint. |
| "Open to" | **Treatment A** — an arc-tinted band holding the label and chips (B, "lit chips", and C, "rail", were mocked and not chosen). |
| Location card | **Centred** (horizontal only — the card is content-sized). |

Technical calls made by the assistant (flag these if they look wrong):

- **`formal-pic.webp` is byte-for-byte the file embedded in the mockup** (18,288 bytes, sha256 `1682ba39a3376018…`), extracted rather
  than regenerated, because a Chromium re-encode need not be byte-identical.
- **The shader ships the mockup's exact GLSL minus the review switch** (`uLegacy`). Every look value is still a uniform (`HOLO_LOOK`).
- **The hologram code was split** into `holoMaterial.ts` and `cardFrame.ts` so the logic is unit-testable without WebGL.
- **`SocialIconName` changed** (`youtube` → `upwork`) in `types.ts`, the "frozen" contracts file — sanctioned by the owner's request.
- **The Upwork glyph is pasted, not imported** (`SocialIcon.tsx` promises "no icon library"); CC0-1.0, trademark remains Upwork's.
- **`Chip` gained a `tone` prop** that *swaps* its neutral classes. `cn` is a plain joiner with no Tailwind conflict resolution, so an
  accent background passed via `className` would emit two competing `background-color` rules.
- **Commit style:** branch first, Conventional Commits, **no `Co-Authored-By` trailer** (the owner's CLAUDE.md outranks the harness's
  default attribution reminder). Nothing has been committed.

## 4. Testing & verification

Everything below was actually run against the final tree.

- **Unit: 484 tests pass across 40 files** (414 / 35 at the start). New: `contactUrl`, `formalPic` (asset), `Chip`, `cardFrame`,
  `holoMaterial`; extended: `ConnectSign`, `App`, `content`, `SocialHex`, `LocationCard`, `IntroCard`, `contrast`. `typecheck`, `lint` clean.
- **e2e at one worker (as CI runs it): 86 passed, 24 skipped, 0 failed** (4.2 min; 110 tests). The baseline before any change was 83
  passed / 24 skipped / 0 failed; the three extra are the centring test on two projects and the 3D picture guard.
- **3D pixel fidelity** (app canvas vs a patched copy of the mockup, same static state, light theme, 546×596):
  front **mean |Δ| 0.000**; back **0.077** — the only differences are 1-pixel edges on the four corner brackets (a sub-pixel
  rotation difference between the scripted drag and the mockup's fixed angle).
- **2D fidelity** (element boxes, ≤ 1px), light + dark at 1440×900 and 1280×720: intro, "Open to" band/label/chips, sign, stage,
  Download CV, hexagons, Upwork icon all ≤ 0.53px; **the location card is exactly 0.00px** and pixel-identical (mean 0.05).
- **Bundle:** initial JS 136.36 → 136.73 kB gzip (+0.37); lazy hologram chunk 240.93 → 241.93 (+1.00); CSS 12.85 → 13.01. The 18 kB photo
  is a separate file only the lazy 3D chunk requests.
- **Ten mutation tests — every guard fails when its fix is reverted, then the file is restored byte-identical:**

  | Mutation | Guard that caught it |
  |---|---|
  | colour off (`uColor 0`) | e2e — "no warm/green pixels" |
  | the legacy veiled scan band | e2e — "white veil" |
  | the opaque back photo | e2e — "no bust stands out" |
  | location content not centred | e2e — "off the card's centre line" |
  | faces double-sided (culling off) | unit — "FRONT-face only" |
  | the veiled band in the GLSL | unit — "FIXED scan band" |
  | sign back to a `mailto:` | unit — "Gmail compose" |
  | location content not centred | unit — "centres the content" |
  | accent chip keeps the neutral ring | unit — "INSET arc ring" |
  | glint behind the bezel face | unit — "IN FRONT of the bezel" |

  The e2e thresholds were calibrated by breaking the thing and *measuring* (table in `e2e/hologram.spec.ts`): non-blue pixels 2.76% approved
  vs 0.00 colour-off; luma 5th percentile 64 vs 147 with the veil; back-face margins 46–67 vs 204–223 with the opaque photo.

### Not verified

- **The look on a real GPU** — headless software GL only. Same shader, same `three` (0.186.0), same bytes as the mockup the owner
  reviewed on their own machine, so it should match; it has not been seen.
- **The live Gmail compose** — no Google sign-in here. The owner should click the sign once.

## 5. Findings worth keeping (the first five each corrected the plan)

1. **The formal photo has no transparency.** 600×600 RGBA, all 360,000 pixels alpha 255 on white. The header said "has an alpha
   channel"; nobody counted pixels. The cutout: flood-fill the near-white region connected to the top/left/right edges (T=246; the
   bottom is *not* seeded — the white collar touches it), then solve alpha per edge pixel against the colour of its interior neighbours
   (a plain luminance ramp leaves a pale halo along the hair).
2. **The live hologram shader had an inverted `smoothstep`** — `smoothstep(0.04, 0., bd)` is 1 for every `bd <= 0`, so it added a
   +0.5 white veil over the whole portrait. *That* was the biggest reason the picture was flat (luma 5th percentile 147 with it,
   64 without). Fixing it alone leaves the photo too dark, so it ships with an exposure lift and a subject spotlight.
3. **Do not decode the textures as sRGB.** Measured: mean RGB 90/113/131 → 50/74/96. The shader is a raw `ShaderMaterial` with no
   `colorspace_fragment`, so `NoColorSpace` already passes the bytes through correctly.
4. **The scanlines are coarse, not fine.** `sin(vU.y * 168.0)` is 168 *radians* (~27 cycles, ~10px stripes).
5. **The location card is content-sized** — no vertical dead space; only horizontal centring matters. Its clock margin had to be tuned
   *by measurement* (11.5px → 6.25px) because it was tuned against the round-1 mockup.
6. **Switching the back-face mask off alone changes nothing visible** (under a real cutout the RGB behind the transparent pixels is
   black, so the luminance alpha hides them). The real regression is shipping the *opaque* photo (margins 204–223 vs 46–67), which is
   what the guard and `formalPic.test.ts` catch.
7. **The visual baselines tolerate 1% of pixels** (`maxDiffPixelRatio: 0.01`): the dark desktop one stayed green through visible
   changes. All three were regenerated, and looked at, this session.
8. **An `?inline` asset import + `atob`** is how a `src` test reads a binary without `fs` (`src`'s tsconfig has only `vite/client` types).

### Pre-existing gaps found, deliberately NOT changed (outside the seven items)

Measured app-vs-mockup, present before this session's edits to those cards: the **"Contact & Socials" heading is ~7px higher** in the
app; the **projects heading 1.2px** and **certifications heading 4px** off; the **certifications card 1.5px** (already known from
session 006). The owner can ask for these to be aligned.

### Tooling notes (this machine)

- Git Bash's `$PWD` is `/tmp/...`, which Windows node resolves to `C:\tmp\...` — pass node scripts explicit Windows paths.
- Inline `node -e '…'` breaks on apostrophes (again). Use the Edit tool or a script file.
- The working tree is CRLF (`core.autocrlf=true`); new files are LF and git warns on conversion — harmless.
- `--disable-3d-apis` makes 2D fidelity runs fast, but the mockup's script then stops at its WebGL check, so its `norev` panel-hide never
  runs — hide `.review` with injected CSS or it overlaps the left column at short viewports.
- Software-GL screenshots need explicit long timeouts; the webgl guard is a single test with steps because every mount is slow.

## 6. Deployment

None. The work is uncommitted on `feat/round-2-hologram-polish`. Before any commit: the repo is **public**, so `formal-pic.webp` (a
derived cutout of the owner's photo) becomes a tracked, publicly served file (intended), and committing the mockup HTML would also
publish its two embedded base64 photos. Confirm with the owner first.

## 7. State at the end of this session

- **Branch:** `feat/round-2-hologram-polish`, **uncommitted**. Changed: 25 tracked files (incl. the three regenerated baselines);
  new: 11 files (`formal-pic.webp` + its test, `contactUrl` + test, `Chip.test`, `cardFrame` + test, `holoMaterial` + test, this
  summary, the mockup).
- **Verified clean on the final tree:** `typecheck`, `lint`, `test` (484 / 40 files), `build`, `test:e2e` (86 passed, 24 skipped, 0 failed).
- **Still owed by the owner:**
  - A live look on a real GPU in both themes — front colour, the back bust, the spin between them, the frame and glint.
  - One click on the Gmail sign to confirm it opens a compose window addressed to them.
  - Their Upwork URL (`socials.ts` — the hexagon is `#` until then) and, still, real URLs for X, Instagram and TikTok; a real CV PDF.
  - A go to commit, and separately to push / deploy. Whether committing the mockup HTML (which embeds both photos) is wanted.
  - Whether the pre-existing heading/card offsets in §5 should be aligned to the mockup.
- **Known rough edges (deliberately deferred):**
  - The pre-existing offsets in §5 ("Contact & Socials" heading ~7px, projects 1.2px, certifications heading 4px / card 1.5px).
  - `badge.subtitle` still reads "CS Student · Mobile Dev" (visible only on the no-WebGL fallback card, which stays single-photo by
    scope); the README still describes a "physics-driven lanyard badge".
  - The contrast table's hex values remain hand-synced; four new pairs were added.
  - Visual baselines exist only as `*-chromium-win32.png` (none for Linux CI), and tolerate 1% of pixels.
  - Mobile layout and the project overlay have still had no design review.

## 8. Where things live

- Approved mockup: `docs/reference/2026-09-20-revamp-round-2-mockup.html` (untracked)
- Hologram: `src/three/HologramScene.tsx`, `holoMaterial.ts` (shader + `HOLO_LOOK`), `cardFrame.ts` (z-stack, rim, glint)
- Back-face photo: `src/assets/formal-pic.webp` (+ `formalPic.test.ts`)
- Gmail link: `src/lib/contactUrl.ts`, `src/features/connect/ConnectSign.tsx`, `src/content/socials.ts`
- Location card: `src/features/location/LocationCard.tsx` · "Open to": `src/features/intro/IntroCard.tsx`, `src/components/ui/Chip.tsx`
- Contrast budget: `src/lib/contrast.ts` (+4 pairs) · Upwork glyph: `src/features/social/SocialIcon.tsx`
- e2e picture guards + calibration table: `e2e/hologram.spec.ts`; centring: `e2e/clock.spec.ts`
- Prior sessions: `docs/session/001–006-session-summary.md`
