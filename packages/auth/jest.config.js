const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  // Auth's service specs exercise real Mailpit + MockServer containers, so the
  // suite boots them once via globalSetup (NODE_ENV=specs selects the ports).
  globalSetup: "<rootDir>/fixtures/specs/global-setup.ts",
  globalTeardown: "<rootDir>/fixtures/specs/global-teardown.ts",
  setupFilesAfterEnv: [...base.setupFilesAfterEnv, "@neomaventures/fixtures/matchers"],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "fixtures/(.*)$": "<rootDir>/fixtures/$1",
  },
}
