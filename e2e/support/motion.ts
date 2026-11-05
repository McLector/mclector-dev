/**
 * A Playwright `storageState` with the site's Animations toggle switched ON. The suite itself stores "off"
 * (playwright.config.ts), so a spec that needs the real, animated site opts in with this. The origin is passed in
 * because the preview port is derived from the working directory, so it cannot be a constant.
 */
export function animationsOnState(origin: string) {
  return {
    cookies: [],
    origins: [{ origin, localStorage: [{ name: "mclector-motion", value: "on" }] }],
  };
}
