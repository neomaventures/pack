/**
 * Shared Jest config for @neomaventures/* packages — the root base, alongside
 * tsconfig.base.json and eslint.config.mjs. Packages extend it:
 *
 *   module.exports = require("../../jest.config.base.js")
 *
 * or spread it and add package-specific keys (globalSetup, extra mappers):
 *
 *   const base = require("../../jest.config.base.js")
 *   module.exports = { ...base, globalSetup: "..." }
 *
 * The transform matches `.ts`/`.tsx` only — never `.js` — so @swc/jest never
 * tries to recompile a dependency's already-built compiled output (which pnpm
 * symlinks to a package's dist dir, outside node_modules). `<rootDir>`
 * resolves to each consuming package's directory.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
            dynamicImport: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  testEnvironment: "node",
  roots: ["<rootDir>/src/"],
  setupFiles: ["reflect-metadata"],
  setupFilesAfterEnv: ["jest-extended/all"],
  // No shared module mappers: unit specs import relative to source, and any
  // package-specific aliases (fixtures/, @neomaventures/<pkg>) are added per package.
  moduleNameMapper: {},
}
