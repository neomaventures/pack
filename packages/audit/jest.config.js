const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "^@neoma/argos$": "<rootDir>/src",
    "^@neoma/argos/(.*)$": "<rootDir>/src/$1",
  },
}
