const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  globalSetup: "@neoma/minio/setup",
  globalTeardown: "@neoma/minio/teardown",
  setupFilesAfterEnv: [
    ...base.setupFilesAfterEnv,
    "<rootDir>/fixtures/matchers/index.js",
    "@neoma/fixtures/matchers",
  ],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "fixtures/(.*)$": "<rootDir>/fixtures/$1",
  },
}
