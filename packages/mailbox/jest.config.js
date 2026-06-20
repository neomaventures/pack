const base = require("../../jest.config.base.js")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  // Mailbox's GmailService spec hits a real MockServer container so it
  // verifies its HTTP behaviour against the wire, not a fetch mock.
  globalSetup: "<rootDir>/fixtures/specs/global-setup.ts",
  globalTeardown: "<rootDir>/fixtures/specs/global-teardown.ts",
}
