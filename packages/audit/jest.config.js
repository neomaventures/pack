const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "^@neoma/audit$": "<rootDir>/src",
    "^@neoma/audit/(.*)$": "<rootDir>/src/$1",
  },
}
