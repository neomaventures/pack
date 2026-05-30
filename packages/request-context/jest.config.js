const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // Spec convention (#28): import the public barrel only, resolved to src (no
    // build). Internal symbols must be reached with an explicit relative import
    // — there is deliberately no `@neomaventures/request-context/<subpath>` mapping, so
    // a deep import via the package name fails.
    "^@neomaventures/request-context$": "<rootDir>/src",
  },
}
