import { defineConfig, devices } from "@playwright/test";
import { createHash } from "node:crypto";

/**
 * Each git worktree in this project (see docs/contracts.md — parallel
 * streams each work in their own worktree) shares nothing with the others
 * except the filesystem being on the same machine. A fixed preview port
 * meant Playwright's `reuseExistingServer` would silently attach one
 * worktree's test run to a DIFFERENT worktree's already-running preview
 * server on that same port, testing the wrong code with no error.
 *
 * Deriving the port from a hash of the working directory gives every
 * worktree (and CI, and a bare checkout) its own stable port deterministically,
 * with no coordination required and no risk of collision between them.
 */
function portForThisWorkingDirectory(): number {
  const hash = createHash("sha256").update(process.cwd()).digest();
  const offset = hash.readUInt16BE(0) % 1000;
  return 4200 + offset; // 4200-5199, clear of Vite's default dev port range
}

const PORT = portForThisWorkingDirectory();
const ORIGIN = `http://localhost:${PORT}`;

/**
 * The suite runs with the site's own Animations toggle switched OFF (`localStorage["mclector-motion"] = "off"`).
 * That freezes AMBIENT motion (keyframes, the falling-code canvas, parallax, the hologram spin), which is what
 * keeps the visual baselines and the hologram picture guards deterministic. It used to be done with Playwright's
 * `reducedMotion: "reduce"`, but the site no longer reads the OS setting (owner decision), so that lever is gone.
 *
 * It never affects hover: hover and focus transitions are locked on in both states of the toggle. A spec that
 * needs the real, animated site opts out with `test.use({ storageState: ANIMATIONS_ON })` (see e2e/hover.spec.ts).
 */
const ANIMATIONS_OFF = {
  cookies: [],
  origins: [{ origin: ORIGIN, localStorage: [{ name: "mclector-motion", value: "off" }] }],
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: ORIGIN,
    trace: "on-first-retry",
    storageState: ANIMATIONS_OFF,
    // Run with 3D APIs DISABLED, so the hologram cell settles on the static
    // fallback card. Under headless swiftshader the live WebGL scene is
    // software-rendered and never settles: it pins a CPU core and starves axe,
    // keyboard-interaction and exit-animation assertions into flaky timeouts.
    // The WebGL path has its own project below (hologram.spec.ts), and the
    // visual baselines mask the hologram cell either way.
    launchOptions: { args: ["--disable-3d-apis"] },
  },
  projects: [
    { name: "chromium", testIgnore: /hologram.spec.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", testIgnore: /hologram.spec.ts/, use: { ...devices["Pixel 7"] } },
    {
      // The one project with WebGL: guards the animations-off-still-renders-3D fix.
      name: "webgl",
      testMatch: /hologram.spec.ts/,
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
        },
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Never silently attach to a server left running by a *different*
    // working directory — see the comment above. A leftover server from a
    // previous run of THIS SAME directory is still fine to reuse locally.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
