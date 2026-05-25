/**
 * @fileoverview Environment file fixture for testing .env file loading precedence.
 *
 * IMPORTANT: Must set process.env.NODE_ENV BEFORE any beforeEach/beforeAll hooks run.
 * The fixture creates environment-specific files based on NODE_ENV value during test setup.
 *
 * @example
 * // Correct usage:
 * import "fixtures/env"  // Import at top is fine
 *
 * const environment = 'production'
 * process.env.NODE_ENV = environment  // Set BEFORE beforeEach runs
 *
 * describe('My tests', () => {
 *   beforeEach(() => {
 *     // Fixture files are created here based on NODE_ENV
 *   })
 * })
 *
 * @example
 * // Incorrect usage:
 * import "fixtures/env"
 *
 * describe('My tests', () => {
 *   beforeEach(() => {
 *     process.env.NODE_ENV = 'production'  // Too late! Fixture setup already ran
 *   })
 * })
 *
 * @remarks
 * Creates the following files with test values for precedence testing:
 * - .env - Base configuration
 * - .env.local - Local overrides
 * - .env.{NODE_ENV} - Environment-specific config
 * - .env.{NODE_ENV}.local - Environment-specific local overrides
 *
 * Files are automatically cleaned up via Jest hooks.
 * Test values are designed to verify correct precedence order.
 *
 * @file fixtures/env/index.ts
 */
import { copyFileSync, rmSync } from "fs"

beforeEach(() => {
  copyFileSync("fixtures/env/.env.{node_env}", `.env.${process.env.NODE_ENV}`)
  copyFileSync(
    "fixtures/env/.env.{node_env}.local",
    `.env.${process.env.NODE_ENV}.local`,
  )
})

afterEach(() => {
  rmSync(`.env.${process.env.NODE_ENV}`, { force: true })
  rmSync(`.env.${process.env.NODE_ENV}.local`, { force: true })
})
