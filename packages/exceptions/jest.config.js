const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // Spec convention: import the public barrel, resolve to src (no build).
    "^@neomaventures/exceptions$": "<rootDir>/src",
    "^@neomaventures/exceptions/(.*)$": "<rootDir>/src/$1",
  },
}
