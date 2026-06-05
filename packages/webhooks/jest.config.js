const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  setupFilesAfterEnv: [
    "jest-extended/all",
    "@neomaventures/fixtures/matchers",
  ],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "fixtures/(.*)$": "<rootDir>/fixtures/$1",
  },
}
