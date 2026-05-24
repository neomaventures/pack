/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
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
