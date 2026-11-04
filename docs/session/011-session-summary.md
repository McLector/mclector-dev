# Session 011: Status Review, Real Links, the CV, and a Green CI

**Date:** 2026-11-04 to 2026-11-05
**Repo:** `C:\Project\portolio-projects\Portu-Folio` (local folder name is old; the repo is `mclector-dev`) — https://github.com/McLector/mclector-dev
**Work:** committed straight to `main` and pushed, at the owner's request. Each push redeploys production.
**Live URL:** https://mclector-dev.vercel.app

Like sessions 001–010, this records *what happened and why*, not a task handover.

---

## 1. What this session was

The owner asked what the last piece of work was and what was still open. The local clone was stuck at session 001 (`55a1550`) while GitHub held sessions 002–010, so the first step was `git pull --ff-only`, then a baseline run before any change. The open items from session 010 were then worked through.

## 2. Decisions

| Item | Decision |
|---|---|
| Phone checks from session 010 §7 and §11 | **Deferred** by the owner. Still open. |
| X / Instagram / TikTok / Upwork | Real URLs supplied and wired in. The Upwork share link's `?mp_source=share` tracker was dropped. |
| CV | Published **as-is, phone number included**. The owner asked whether making the repo private would help; it would not, because the Download CV button serves the PDF from the live site. Repo stays public. |
| Badge subtitle | `CS Student · Full-Stack Mobile Dev`, to match the resume. |
| Welcome to Lipa City | Added to the site as a non-featured project. The resume was not touched. |
| Certifications | **Kept empty for now** by the owner, to be added later. |
| Custom domain | Stay on `*.vercel.app`. |
| Mockup images | Stay local and untracked. They were not on this machine (session 010 ran from `D:\Projects\mclector-dev`, which does not exist here). |
| Stale remote branches | Deleted: both were 0 commits ahead of `main`. Local `stream-a…g` branches deleted too, all merged. |

## 3. What changed

- `src/content/socials.ts`: four real URLs, `TODO` comments removed.
- `public/myre-morada-cv.pdf` plus `profile.cv` set to `{ href, available: true }`. `ActionsRow` already switched to the ready link when both are set.
- `profile.badge.subtitle` updated; `BadgeFallback.tsx` gained a `data-badge-subtitle` attribute so e2e can prove the longer text is not truncated.
- `src/content/projects.ts`: `welcome-to-lipa-city`, repo link only (the game is unpublished).
- `.github/workflows/update-visual-baselines.yml`: manual workflow that generates Linux baselines on the CI runner.
- `e2e/visual.spec.ts-snapshots/*-chromium-linux.png`: three Linux baselines, reviewed by eye before committing.
- GitHub repo homepage corrected: it pointed at `mclector-dev-8nne.vercel.app`, which returns 404.

## 4. Findings worth keeping

1. **The plan was written from session 001's picture of the code.** The lanyard badge had since become a hologram, the contact form and its endpoint were deleted, and the canvas text painter was gone. Re-reading the current files before editing caught that the subtitle is now only rendered by `BadgeFallback`.
2. **The visual baselines did not need regenerating for the CV button.** The button went from dimmed to ready, but the change is about 7k pixels against a `maxDiffPixelRatio: 0.01` allowance of roughly 13k. So `visual.spec.ts` is not a strict guard of that button; the e2e link assertion is.
3. **`src/` has no Node types.** A unit test that used `node:fs` broke `tsc`. `import.meta.glob("/public/*.pdf")` answers "does the file exist" without them; the PDF's bytes are checked in e2e against the built site.
4. **CI had never been green** because only `win32` baselines existed. The fix is to generate `linux` ones on the runner, not to loosen the tolerance.

## 5. Testing & verification

TDD: the new tests were watched fail for the right reason first (5 red in `content.test.ts`: `#` hrefs, `available: false`, old subtitle, missing project, missing PDF).

- **Baseline before any change:** typecheck and lint clean, unit **556 / 46 files**, e2e **173 passed, 53 skipped, 4 failed**. All four failures are the `webgl` hologram canvas-size tests, the load-sensitive flake measured in session 010 §11.
- **After:** typecheck and lint clean, unit **562 / 46**, e2e **178 passed, 56 skipped, 4 failed**: the same four webgl tests. Nothing else fails.
- **CI:** green on the final push (§6).

## 6. State at the end of this session

- Local `main` equals `origin/main`. The working tree is clean.
- Only `main` remains, locally and on GitHub.
- **CI is green** for the first time: run `41875789320` on `ed03676` concluded `success`. Earlier runs all failed on the three missing Linux baselines. The run was slow (over 10 minutes, with `workers: 1` and `retries: 2`), so a slow run is not by itself a sign of a hang.

## 7. Still open

- **The owner's phone checks** (session 010 §7 and §11), against https://mclector-dev.vercel.app.
- **Certifications:** the resume lists 9 (freeCodeCamp ×2, DataCamp ×7); the card still shows "Coming soon". Needs proof/credential URLs.
- **Welcome to Lipa City status** is set to `in-progress` as an assumption, from the repo's recent activity. Change `status` in `projects.ts` if the game is finished.
- **Hologram canvas-size flake**: 4 webgl tests fail intermittently on this machine; CI has `retries: 2`.
- Carried over: the 16px favicon; the README's "lanyard badge"; wide-phone and tablet-landscape overlap of the toggles at 861px and up; bundle size.
- Custom domain `mclector.dev` is not bought; the owner chose to stay on `*.vercel.app`.

## 8. Tooling notes (this machine)

- `gh` is on PowerShell's PATH here. `--%` (stop-parsing) breaks when `-H` or `--jq` follow it, so quote arguments normally instead.
- `Read` cannot render PDFs (no `pdftoppm`) and `pypdf` is not installed, so the CV was verified by its `%PDF-` header and by being the same file the owner pointed at.
- Long Playwright runs were run detached to a log under `%TEMP%\mclector-logs`.
