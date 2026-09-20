# Session 010 — Mobile Browser Pass: the Toggle Dock and a Native-Feel Baseline

**Date:** 2026-09-20 to 2026-09-21
**Repo:** `D:\Projects\mclector-dev` — https://github.com/McLector/mclector-dev
**Work branch:** `feat/mobile-native-pass` (from `main` at `f298836`), pushed for review, then **fast-forward merged to `main` and pushed at the owner's explicit request**. The branch was deleted afterwards. No deploy command was run from here.
**Live URL:** https://mclector-dev.vercel.app: **redeployed by the push to `main`**. Checked afterwards by fetching the live HTML, which serves `viewport-fit=cover` and the `theme-color` boot write. That proves the new build is live, not that the mobile view works on a phone (§7).

Like sessions 001–009, this records *what happened and why*, not a task handover. Flow: **question → read the code → plan → review the plan (three times) → tests first → implement → prove.**

---

## 1. What this session was

The owner loved the desktop view and reported that the **mobile browser view looked bad: the day/night toggle was superimposed on the cards and elements.** Their question was whether anything could be done about mobile **without implicating the desktop view.**

This closes the open item in session 009 §7 ("Mobile toggles… decide whether to shrink or relocate them on phones").

## 2. The answer: yes, and structurally

The codebase already has a hard split at **860px**, in three places that agree: `MOBILE_MAX` in `useFitScale.ts`, the `@media (max-width: 860px)` block in `bento.css`, and the separate `.app-window--mobile` branch in `AppFrame.tsx`. Desktop is a fixed 1200×770 window scaled as one unit; mobile is a plain scrolling stack. So every layout change is scoped under that breakpoint, and every unscoped change is a touch-only property with no desktop rendering effect.

That claim is testable, so it was tested: the two desktop pixel baselines (`home-desktop`, `home-desktop-light`) must pass **untouched**. They did.

## 3. The bug

The two round toggles were `position: fixed; top-4 right-4`. On desktop the scaled window is centred with margin around it, so they float in empty space. On mobile the window is full-width, so the same spot lands on the intro card's corner and headline. It is visible in the session-009 mobile baseline.

## 4. Decisions

| Item | Decision |
|---|---|
| Toggle placement on phones | **Bottom-right floating pair, laid out as a row** (owner's pick over top-right-with-clearance and an inline header row). Desktop keeps the top-right column. |
| Scope | **Toggle fix plus a native-feel pass**, not a full mobile layout redesign. |
| Where it was seen | A **real phone browser**, so the hardware-only checks in §7 are the owner's to confirm. |
| Branch | Built and pushed on a branch first, because a push to `main` can trigger a production deploy. Merged to `main` only once the owner asked for that. |

## 5. What changed

- **`src/styles/index.css`**: new `.toggle-dock` class (column, top-right, `1.25rem` / `0.5rem`, in `rem`); under 860px a row pinned bottom-right with `env(safe-area-inset-*)`. New touch baseline in `@layer base`: no tap-highlight flash, no landscape font inflation, `touch-action: manipulation`, and `user-select: none` on **buttons only**.
- **`src/App.tsx`**: the toggle wrapper is `className="toggle-dock"`.
- **`src/layout/AppFrame.tsx`** (mobile branch): safe-area padding on top and sides; `5rem` plus the bottom inset below, so the last card scrolls clear of the dock.
- **`index.html`**: `viewport-fit=cover` (without it every `env(safe-area-inset-*)` is `0px`); the boot script now also sets `theme-color`, so the status bar is right on first paint.
- **`src/layout/bento.css`**: mobile hologram stage `clamp(400px, 66vh, 660px)` → `clamp(300px, 48svh, 460px)`. `vh` is the large viewport on a phone, and two-thirds of the screen for one decorative element pushed every real card below the fold.
- **`ProjectOverlay.tsx`**: bottom padding clears the home indicator; `overscroll-contain` on its scroller (a modal that really scrolls over a scroll-locked page, which is what that class is for). The same class was first also added to the skills, projects and certifications lists, and that broke touch scrolling on them: see §11.

## 6. Findings worth keeping

1. **A media query is the wrong tool here, and the repo forbids it.** `e2e/compiled-css.spec.ts` and `hoverAndMotionPolicy.test.ts` ban `pointer: coarse` and `hover:` queries (session 009's policy). Mobile-only CSS therefore uses `max-width: 860px`, or properties that are inert with a mouse.
2. **Tailwind utilities beat `@layer components`.** Keeping `flex-col` as a utility and switching to a row under 860px in a class would silently do nothing: the utility wins and the dock stays vertical on phones. So the wrapper is one hand-written class, and the test that pinned the literal `flex-col` string had to change.
3. **Use `rem`, not `px`.** `20px` matches the old utilities only at a 16px root; a visitor with a larger browser font would get a dock that stopped scaling. A test pins `1.25rem` at a 20px root.
4. **A fixed control always floats over *something* mid-scroll.** The testable contract is narrow and honest: at the top the dock clears the intro, sign and Download CV; at the bottom the last card clears the dock. A test asserting "overlaps no card, ever" could never pass.
5. **`--update-snapshots` at file level would rewrite the desktop baselines too** and destroy the proof. The mobile baseline was regenerated with `-g "mobile 390x844" --project=chromium`, and only that one PNG changed.
6. **The visual baseline cannot show the dock.** Playwright's `pass` mask is painted over the bottom-right corner where the dock now sits. The mobile screenshot proves the *absence* of the overlap; the dock's position is guarded by measured bounding boxes in `responsive.spec.ts`.
7. **I missed a test I should have read.** `animations.spec.ts` runs on the `mobile-chrome` project and pinned the toggles as a *vertical* stack, which the owner's row decision necessarily contradicts. I had grepped the toggle test-ids but not read that test; the full run caught it. Lesson: read every hit, not the ones that look relevant. It now branches by layout. Note its `desktopOnly()` helper reads **inverted** (true when the project is *not* desktop).
8. **A `git stash` baseline separates flake from regression cheaply.** Used for the webgl failures in §7.
9. **`reuseExistingServer` is a stale-`dist` trap.** Playwright's port is derived from the working directory (`4888` here). Anything already listening on it would be reused and the rebuild skipped. Checked before each run; the listener seen on 5040 was an unrelated `svchost`.
10. **`overscroll-behavior: contain` belongs only on a container that actually scrolls.** MDN: a scroll container with no scrollable overflow is always at its scroll boundary, so `contain` on it stops a swipe chaining to the page. In the mobile stack the skills and projects lists never overflow, so a finger on either card could not scroll the page. This shipped, was reported by the owner from the live site, and is fixed and guarded (§11).

## 7. Testing & verification

TDD: each test was watched **fail for the right reason** before the change.

- **Red phase:** the unit test failed on the missing class; the e2e specs went **7 failed / 27 passed**, including `theme toggle covers intro` → `Received: true`, which is the reported bug reproduced as a failing assertion. The `rem` test and the dark-theme boot cases passed on the old code by design (they pin behaviour that must survive).
- **Final tree:** `typecheck` clean, `lint` clean, **unit 556 / 46 files** (same count as session 009: one test rewritten, none added).
- **e2e, all three projects: 172 passed, 49 skipped, 1 failed** (222 runs; session 009 had 200, and the +22 are the new specs).
- **The one failure is a webgl canvas-size test** (`hologram.spec.ts`, "the canvas fills its container at 1440x900"). It is flaky on the code from before this session: the webgl project run twice on stashed, pristine code failed that same test in 1 of 12 runs. On this branch the webgl project failed 1 of 6, 2 of 6 and 1 of 6 across three runs, with the failing test varying (1366×768, 1440×900, "centred"). That was **not a controlled comparison**; a proper interleaved A/B was run later and is in §11 (no regression: the pre-branch code fails as often). The predicates are timing-based under software GL.
- **Desktop unchanged:** both desktop baselines passed without being regenerated.
- **New guards:** `responsive.spec.ts` (dock geometry on desktop and mobile, the reported overlap, the `rem` scaling), `compiled-css.spec.ts` (tap-highlight, `touch-action`, safe-area insets, `viewport-fit=cover`, no zoom disabling, no blanket `user-select: none`), `boot.spec.ts` (`theme-color` before React runs, expected values read from `THEME_COLOR` so the inline script cannot drift), `App.test.tsx`.

### Not verified (the owner's, on the phone)

1. The toggles no longer cover the headline or any card corner at the top, and the last card scrolls clear of them at the bottom.
2. No grey flash when tapping a hexagon, a project row or a toggle.
3. Nothing sits under the notch or home indicator, portrait and landscape.
4. Switching to light changes the status-bar colour, and a reload in light shows no dark flash.
5. Long-pressing a button does not select its label, but the email on the sign can still be selected and copied.

Verified after the push, so no longer open: the live site is the new build (see the header). The owner can now run the five checks above straight against https://mclector-dev.vercel.app.

## 8. Known rough edges

- **The dock floats over the hologram and the lists mid-scroll.** By design (finding 4).
- **Wide phones and small tablets in landscape still see an overlap.** At 861px and up the desktop layout applies, and the dock's desktop position is unchanged. By arithmetic (not measured), at 1024×768 the window spans x 24–1000 and y 71–697 while the Animations toggle sits at x 964–1004, y 68–108, so it clips the window's top-right corner. This predates this session (009 noted the theme toggle already overlapped the corner) and was left alone because desktop was to stay exactly as approved.
- **The webgl canvas-size flake** (§7, measured in §11): load-sensitive on this 4-core machine, present before this branch, not a regression.
- **The Download CV label stays selectable** once a PDF exists, because it is an `<a>`; the price of keeping the sign's email copyable.
- **No root `overscroll-behavior`, no `interactive-widget`.** Deliberate: mobile is a real scrolling document where pull-to-refresh is expected, and the page has no text inputs.
- Carried over from 009: the 16px favicon; real URLs for X / Instagram / TikTok / Upwork and a CV PDF; `badge.subtitle` still reading "CS Student · Mobile Dev"; the README's "lanyard badge"; Linux CI visual baselines. The four round-3 / round-3b mockup and logo-sheet files are **still untracked and deliberately not committed** (the repo is public and they embed the photos).

## 9. State at the end of this session

- **Branch:** work landed on `main` by fast-forward (the code and its tests, this summary, and two small follow-up commits correcting it as the merge and the deploy were confirmed). `feat/mobile-native-pass` is deleted locally and on `origin`. A later `fix(mobile)` commit repairs the scroll regression described in §11.
- **Cleanup done:** the local `feat/round-3-hover-motion-palette` branch from session 009 was already fully merged into `main` and was deleted. The remote `feat/dark-by-default` and `feat/round-2-hologram-polish` are also fully merged but were **left in place**: they were not created this session, and deleting a remote branch is the owner's call.
- **Working tree:** clean apart from the four untracked mockups.
- **Still owed by the owner:** the five phone checks in §7, now against the live site; a decision on the mockups and on the two stale remote branches.

## 10. Where things live

- Toggle dock: `.toggle-dock` in `src/styles/index.css`; wired in `src/App.tsx`; toggles in `src/components/ui/ThemeToggle.tsx`, `MotionToggle.tsx`, `roundToggle.ts`
- Touch baseline: `@layer base` in `src/styles/index.css`
- Mobile shell and safe areas: `src/layout/AppFrame.tsx`, `src/layout/bento.css`, `index.html`
- Guards: `e2e/responsive.spec.ts`, `e2e/compiled-css.spec.ts`, `e2e/boot.spec.ts`, `e2e/animations.spec.ts`, `src/App.test.tsx`
- Prior sessions: `docs/session/001–009-session-summary.md`

### Tooling notes (this machine)

- **`python` is not on PATH** (the Windows Store shortcut answers instead); use the Edit tool for text changes.
- **`gh` is not on PATH in either shell.** Repo visibility was checked through the public API (`Invoke-RestMethod https://api.github.com/repos/McLector/mclector-dev`): public.
- Background Playwright runs: a command that ends in `echo "exit=$?"` reports the wrapper's exit code to the harness, so read the `exit=` line in the log, not the task notification.

## 11. Addendum: a regression from this session, reported from the live site

**Report.** After the push the owner tested on a real phone: with a finger on **Featured Projects** or **Skills & Tools** the page would not scroll; anywhere else it did.

**Cause: my own change.** The mobile pass added `overscroll-contain` to the inner lists of the skills, projects and certifications cards. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior): *"A scroll container that has no scrollable overflow… is always considered to be at its scroll boundary. So setting a non-default `overscroll-behavior` such as `contain` or `none` on it will prevent scroll chaining to ancestor scroll containers."* On a phone those cards grow to fit their content, so the lists (`overflow-y: auto` only as a desktop safety net) never overflow, and a swipe that started on one never reached the page. On desktop the class protected nothing either: the window is fixed and the page never scrolls.

**Reproduced before fixing**, with real touch events (Pixel 7 emulation) against the shipped code. Page movement per swipe: intro card 285px, **skills list 0px**, **projects list 0px**, socials card 223px. Exactly the two cards reported.

**Why I missed it.** No e2e scrolled by touch. The `mobile-native` guidance ("`contain` on inner scrollables") presumes containers that really scroll, and my plan repeated it without checking that these never scroll on a phone. The mobile screenshot itself showed every skill and project unclipped.

**Fix.** `overscroll-contain` removed from the three lists. The project overlay keeps it: a modal that really scrolls over a scroll-locked page.

**Guards** (each watched fail on the old code first).
- `e2e/responsive.spec.ts`: a rule, not a class name. *A non-default `overscroll-behavior-y` is only allowed on a container the user can actually scroll.* Red on the old code, naming exactly the two lists.
- `e2e/touch-scroll.spec.ts` (mobile-chrome project): real swipes from the intro card (control), Skills and Projects. On the old code the control passed and both lists moved the page 0px. **Gotcha:** CDP `Input.synthesizeScrollGesture` with `gestureSourceType: "touch"` and `speed: 1200` scrolled nothing even on a card with no scroller, which cannot tell "swallowed" from "gesture broken"; the spec uses hand-rolled `Input.dispatchTouchEvent` and keeps the control so the two stay distinguishable.

**Verification.** `typecheck` and `lint` clean; unit **556 / 46**; e2e **175 passed, 53 skipped, 2 failed** (both webgl, below). All three visual baselines passed untouched, as expected for a change with no visual effect. 222 previous runs plus 8 new is 230.

**The webgl flake, measured rather than asserted.** After the fix the webgl project failed 2 of 6 and then 3 of 6 in isolation, worse than the 1 of 12 seen earlier on pre-branch code. Rather than call that flaky, an interleaved A/B (4-core machine, 12 samples per run, two runs each): the commit **before** the mobile pass (`f298836`, in a throwaway worktree) failed **3 and 2 of 12 (5 of 24, 21%)**; the current tree failed **2 and 1 of 12 (3 of 24, 12.5%)**. No regression from the mobile pass or this fix. The tests are load-sensitive (software-rendered WebGL against 15-second polling windows), and the same old code failed 1 of 12 earlier and 21% now. The worktree was removed; its `node_modules` junction was unlinked with `cmd /c rmdir` first, because a recursive delete on Windows can follow a junction into the real folder.

**Still the owner's, on the phone:** a finger-drag that starts on the Skills grid scrolls the page; the same on Featured Projects, and tapping a project row still opens its overlay; the overlay still scrolls without moving the page behind it.
