const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  // The probe-runner unit spec drives a real MockServer container so its
  // HTTP behaviour is verified against the wire, not a fetch mock.
  globalSetup: "<rootDir>/fixtures/specs/global-setup.ts",
  globalTeardown: "<rootDir>/fixtures/specs/global-teardown.ts",
}
