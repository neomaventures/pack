/**
 * @file Sets npm package metadata env vars for testing.
 * Sets random values before each test and restores originals after.
 *
 * @exports npmPackageName - The mocked package name.
 * @exports npmPackageVersion - The mocked package version.
 */
import { faker } from "@faker-js/faker"

export const npmPackageName = faker.word.noun()
export const npmPackageVersion = faker.system.semver()

const originalName = process.env.npm_package_name
const originalVersion = process.env.npm_package_version

beforeEach(() => {
  process.env.npm_package_name = npmPackageName
  process.env.npm_package_version = npmPackageVersion
})

afterEach(() => {
  process.env.npm_package_name = originalName
  process.env.npm_package_version = originalVersion
})
