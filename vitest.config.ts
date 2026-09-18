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
      // src/three/** is WebGL/physics scene code — see docs/contracts.md
      // ("Tier 3 — what NOT to test") for why it is excluded from the
      // jsdom unit suite. Its pure math/texture helpers live outside
      // that directory tree and ARE covered.
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/e2e/**",
        "src/three/**",
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        exclude: [
          "src/three/**",
          "src/main.tsx",
          "**/*.d.ts",
          "e2e/**",
        ],
      },
    },
  }),
);
