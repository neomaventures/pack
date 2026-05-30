const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "^@neomaventures/audit$": "<rootDir>/src",
    "^@neomaventures/audit/(.*)$": "<rootDir>/src/$1",
  },
}
