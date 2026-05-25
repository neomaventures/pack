const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // Spec convention: import the public barrel, resolve to src (no build).
    "^@neoma/logging$": "<rootDir>/src",
    "^@neoma/logging/(.*)$": "<rootDir>/src/$1",
    "^fixtures/(.*)$": "<rootDir>/fixtures/$1",
  },
}
