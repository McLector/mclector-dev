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
      // The R3F hologram scene itself (src/three/HologramScene.tsx,
      // HologramCanvas.tsx) is WebGL code with no jsdom counterpart. Its pure
      // math/texture helpers (src/three/math/**, src/three/textures/**) and
      // BadgeFallback (plain DOM/CSS) DO have real tests and are picked up
      // normally — there is nothing under src/three to blanket-exclude, since no
      // unwanted test files live there.
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
          "src/three/HologramScene.tsx",
          "src/three/HologramCanvas.tsx",
          "src/main.tsx",
          "**/*.d.ts",
          "e2e/**",
        ],
      },
    },
  }),
);
