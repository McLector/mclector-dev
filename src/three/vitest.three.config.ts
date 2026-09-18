import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "../../vite.config.ts";

/**
 * Stream C escape hatch — DO NOT treat this as a second source of truth.
 *
 * The root `vitest.config.ts` excludes `src/three/**` from the jsdom suite
 * (correctly: physics and WebGL are meaningless in jsdom). That exclusion is
 * recursive and, verified empirically with Vitest 5, it ALSO drops a test file
 * that is named explicitly on the CLI — `vitest run src/three/math/x.test.ts`
 * reports "No test files found", and `--exclude` on the CLI *appends* to the
 * config's list rather than replacing it. So there is no flag-only way to run
 * the genuinely pure units that live inside this tree.
 *
 * Stream C may not edit the root config, so it ships this narrowly-scoped one
 * instead. Run it with:
 *
 *   npx vitest run --config src/three/vitest.three.config.ts
 *
 * INTEGRATOR: fold this back into the root config by refining the exclude
 * pattern so the pure subtrees are covered by `npm test`, then delete this
 * file. Suggested replacement for the root `exclude` entry:
 *
 *   "src/three/**\/*",            ->  becomes:
 *   "src/three/*.{ts,tsx}",             // scene entry points only
 *   "src/three/!(math|textures)/**",    // every non-pure subtree
 *
 * (and drop `src/three/**` from `coverage.exclude` in the same way, so
 * dragPlane/badgeFaceTexture/bandTexture coverage is actually reported.)
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: "three-pure",
      environment: "jsdom",
      setupFiles: ["../test/setup.ts"],
      globals: true,
      include: [
        "math/**/*.test.ts",
        "textures/**/*.test.ts",
        "*.test.tsx",
      ],
      root: import.meta.dirname,
    },
  }),
);
