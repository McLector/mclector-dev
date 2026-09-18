import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      globals: true,
      css: true,
      // The R3F/Rapier scene itself (src/three/LanyardScene.tsx,
      // LanyardCanvas.tsx) is WebGL/physics code with no jsdom test
      // counterpart — see docs/contracts.md ("Tier 3 — what NOT to test")
      // for why simulated physics is never asserted in a unit test. Its
      // pure math/texture helpers (src/three/math/**, src/three/textures/**)
      // and BadgeFallback (plain DOM/CSS) DO have real tests and are picked
      // up normally — there is nothing under src/three to blanket-exclude,
      // since no unwanted test files live there.
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/e2e/**",
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        exclude: [
          // The scene entry points only — see the comment above.
          "src/three/LanyardScene.tsx",
          "src/three/LanyardCanvas.tsx",
          "src/main.tsx",
          "**/*.d.ts",
          "e2e/**",
        ],
      },
    },
  }),
);
