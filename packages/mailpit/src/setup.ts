import { startContainer } from "./docker/container"

/**
 * Jest `globalSetup` drop-in that starts a Mailpit Docker container.
 *
 * The container reads its port configuration from the
 * `MAILPIT_SMTP_PORT`, `MAILPIT_API_PORT`, and `NEOMA_TEST_PREFIX`
 * environment variables but does **not** write any environment variables
 * itself. The consumer is responsible for wiring connection details to
 * the code under test.
 *
 * Usage in `jest-e2e.json`:
 * ```json
 * { "globalSetup": "@neomaventures/mailpit/setup" }
 * ```
 */
export default async function setup(): Promise<void> {
  await startContainer()
}
