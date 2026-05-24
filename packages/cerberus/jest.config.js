/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  testEnvironment: "node",
  globalSetup: "@neoma/fixtures/setup/minio",
  globalTeardown: "@neoma/fixtures/teardown/minio",
  roots: ["<rootDir>/src/"],
  setupFilesAfterEnv: [
    "jest-extended/all",
    "<rootDir>/fixtures/matchers/index.js",
    "@neoma/fixtures/matchers",
  ],
  moduleNameMapper: {
    "fixtures/(.*)$": "<rootDir>/fixtures/$1",
    "@lib/(.*)$": "<rootDir>/src/$1",
    "@lib": "<rootDir>/src",
  },
}
