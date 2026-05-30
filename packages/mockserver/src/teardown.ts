import { stopContainer } from "./docker/container"

/**
 * Jest `globalTeardown` drop-in that stops the MockServer Docker container.
 *
 * Usage in `jest-e2e.json`:
 * ```json
 * { "globalTeardown": "@neomaventures/mockserver/teardown" }
 * ```
 */
export default async function teardown(): Promise<void> {
  await stopContainer()
}
