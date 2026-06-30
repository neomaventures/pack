import { defineConfig } from "@playwright/test"

export default defineConfig({
  globalSetup: "./fixtures/ui/global-setup.ts",
  globalTeardown: "./fixtures/ui/global-teardown.ts",
  testDir: "./ui-specs",
  testMatch: "**/*.ui-spec.ts",
  // UI specs interact with a process-wide MockServer singleton (see
  // `@neomaventures/mockserver/fixture`) whose `reset()` clears expectations
  // for all callers. Running workers in parallel lets one worker's
  // `beforeEach` reset wipe another worker's just-registered expectations,
  // causing flaky failures in any spec that exercises the Google OAuth
  // callback or Gmail flow. Pin to a single worker so expectations stay
  // owned by the test that registers them.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command:
      "node --env-file=.env.ui-spec node_modules/@nestjs/cli/bin/nest.js start --watch",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
