const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  setupFilesAfterEnv: [
    ...base.setupFilesAfterEnv,
    "@neoma/fixtures/matchers",
  ],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "^fixtures/(.*)$": "<rootDir>/fixtures/$1",
    "^src/(.*)$": "<rootDir>/e2e/app/$1",
  },
}
