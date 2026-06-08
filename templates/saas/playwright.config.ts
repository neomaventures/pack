import { defineConfig } from "@playwright/test"

export default defineConfig({
  globalSetup: "./fixtures/ui/global-setup.ts",
  globalTeardown: "./fixtures/ui/global-teardown.ts",
  testDir: "./ui-specs",
  testMatch: "**/*.ui-spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
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
