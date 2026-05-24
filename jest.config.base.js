/**
 * Shared Jest config for @neoma/* packages — the root base, alongside
 * tsconfig.base.json and eslint.config.mjs. Packages extend it:
 *
 *   module.exports = require("../../jest.config.base.js")
 *
 * or spread it and add package-specific keys (globalSetup, extra mappers):
 *
 *   const base = require("../../jest.config.base.js")
 *   module.exports = { ...base, globalSetup: "..." }
 *
 * The transform matches `.ts` only — never `.js` — so ts-jest never tries to
 * recompile a dependency's already-built compiled output (which pnpm symlinks
 * to a package's dist dir, outside node_modules). That's what produced the
 * recurring "Unable to process … falling back to original file content"
 * warnings; with a .ts-only transform there's nothing to ignore, so no
 * transformIgnorePatterns is needed. `<rootDir>` resolves to each consuming
 * package's directory.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  testEnvironment: "node",
  roots: ["<rootDir>/src/"],
  setupFiles: ["reflect-metadata"],
  setupFilesAfterEnv: ["jest-extended/all"],
  moduleNameMapper: {
    "@lib/(.*)$": "<rootDir>/src/$1",
    "@lib": "<rootDir>/src",
  },
}
