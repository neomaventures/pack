import { startContainer } from "./docker/container"

/**
 * Jest `globalSetup` drop-in that starts a MockServer Docker container.
 *
 * The container reads its port configuration from the `MOCKSERVER_PORT`
 * and `NEOMA_TEST_PREFIX` environment variables but does **not** write
 * any environment variables itself. The consumer is responsible for
 * wiring connection details to the code under test.
 *
 * Usage in `jest-e2e.json`:
 * ```json
 * { "globalSetup": "@neomaventures/mockserver/setup" }
 * ```
 */
export default async function setup(): Promise<void> {
  await startContainer()
}
