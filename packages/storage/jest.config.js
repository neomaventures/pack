const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  globalSetup: "@neomaventures/minio/setup",
  globalTeardown: "@neomaventures/minio/teardown",
  setupFilesAfterEnv: [...base.setupFilesAfterEnv, "@neomaventures/fixtures/matchers"],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "fixtures/(.*)$": "<rootDir>/fixtures/$1",
  },
}
