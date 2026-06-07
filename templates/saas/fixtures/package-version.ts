/**
 * @file This file is used to mock the package version for testing purposes.
 * It sets a random version before each test and restores the original version after each test.
 *
 * @exports version - The mocked package version.
 */
import { faker } from "@faker-js/faker"

export const version = faker.system.semver()
const originalVersion = process.env.npm_package_version

beforeEach(() => {
  process.env.npm_package_version = version
})

afterEach(() => {
  process.env.npm_package_version = originalVersion
})
