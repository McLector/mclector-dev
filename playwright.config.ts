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

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
        },
      },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
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
