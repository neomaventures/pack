const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  // The filter spec spies on the static singleton Logger.{error,warn,debug};
  // without per-test reset, .mock.calls accumulate across the forEach-generated
  // cases. The source package set this globally; we scope it to this package.
  resetMocks: true,
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // Spec convention: import the public barrel, resolve to src (no build).
    "^@neoma/exception-handling$": "<rootDir>/src",
    "^@neoma/exception-handling/(.*)$": "<rootDir>/src/$1",
  },
}
