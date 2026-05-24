const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  globalSetup: "@neoma/fixtures/setup/minio",
  globalTeardown: "@neoma/fixtures/teardown/minio",
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
