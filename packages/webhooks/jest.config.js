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
    // Spec convention: import the public barrel, resolve to src (no build).
    "^@neomaventures/webhooks$": "<rootDir>/src",
    "^@neomaventures/webhooks/(.*)$": "<rootDir>/src/$1",
    "fixtures/(.*)$": "<rootDir>/fixtures/$1",
  },
}
