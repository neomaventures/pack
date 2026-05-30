import { startContainer } from "./docker/container"

/**
 * Jest `globalSetup` drop-in that starts a MockServer Docker container.
 *
 * Usage in `jest-e2e.json`:
 * ```json
 * { "globalSetup": "@neomaventures/mockserver/setup" }
 * ```
 */
export default async function setup(): Promise<void> {
  await startContainer()
}
