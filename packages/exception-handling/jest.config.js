const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // Spec convention: import the public barrel, resolve to src (no build).
    "^@neoma/exception-handling$": "<rootDir>/src",
    "^@neoma/exception-handling/(.*)$": "<rootDir>/src/$1",
  },
}
