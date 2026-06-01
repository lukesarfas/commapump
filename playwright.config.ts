import { defineConfig, devices } from "@playwright/test";

// E2E config for CommaPump. Tests run against the built site served by
// `astro preview` (port 4330). Desktop Chromium + a mobile profile cover the
// launch/visibility/a11y bar from SPEC §7; the applet is exercised via file://.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // Two retries in CI: the gesture-gated Play button has a rare audio-unlock
  // timing race; retrying absorbs it so CI doesn't email a red build over a flake.
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4330",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Desktop Chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4330",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
