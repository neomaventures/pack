import { stopContainer } from "./docker/container"

/**
 * Jest `globalTeardown` drop-in that stops the Mailpit Docker container.
 *
 * Usage in `jest-e2e.json`:
 * ```json
 * { "globalTeardown": "@neoma/mailpit/teardown" }
 * ```
 */
export default async function teardown(): Promise<void> {
  await stopContainer()
}
