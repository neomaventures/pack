const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  globalSetup: "<rootDir>/fixtures/specs/global-setup.ts",
  globalTeardown: "<rootDir>/fixtures/specs/global-teardown.ts",
  setupFilesAfterEnv: [...base.setupFilesAfterEnv, "@neomaventures/fixtures/matchers"],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "fixtures/(.*)$": "<rootDir>/fixtures/$1",
  },
}
