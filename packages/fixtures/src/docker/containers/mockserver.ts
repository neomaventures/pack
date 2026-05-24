import { execFileSync } from "child_process"

import { waitForHttp } from "../health"
import { stopContainer as stop } from "../stop"
import { type BaseOptions } from "../types"

const MOCKSERVER_IMAGE = "mockserver/mockserver:5.15.0"
const DEFAULT_PORT = 1080
const DEFAULT_PREFIX = "neoma-test"

/**
 * Options for {@link startContainer}.
 */
export type MockServerOptions = BaseOptions

/**
 * Configuration returned by {@link startContainer} describing
 * the running container.
 */
export interface MockServerConfig {
  /** The Docker container name. */
  container: string
  /** The host port MockServer is listening on. */
  port: number
}

/**
 * Starts a MockServer Docker container, waits for it to become healthy,
 * and sets the `MOCKSERVER_URL` environment variable.
 *
 * The port is read from the `MOCKSERVER_PORT` env var (default `1080`).
 * The container name is `{prefix}-mockserver` where prefix defaults to
 * the `NEOMA_TEST_PREFIX` env var, or `"neoma-test"`.
 *
 * Any pre-existing container with the same name is removed first to
 * ensure a clean start.
 *
 * @param options - Optional overrides for the container name prefix
 * @returns The container name and host port
 *
 * @example
 * ```typescript
 * const config = await startContainer()
 * // config.container === "neoma-test-mockserver"
 * // config.port === 1080
 * // process.env.MOCKSERVER_URL === "http://localhost:1080/mockserver"
 * ```
 */
export async function startContainer(
  {
    prefix = process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
    port = Number(process.env.MOCKSERVER_PORT) || DEFAULT_PORT,
  }: MockServerOptions = {
    prefix: process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
    port: Number(process.env.MOCKSERVER_PORT) || DEFAULT_PORT,
  },
): Promise<MockServerConfig> {
  const container = `${prefix}-mockserver`

  // Remove any stale container with the same name
  await stop(container)

  execFileSync(
    "docker",
    [
      "run",
      "-d",
      "--name",
      container,
      "-p",
      `${port}:1080`,
      "--",
      MOCKSERVER_IMAGE,
    ],
    { stdio: "ignore" },
  )

  await waitForHttp(`http://localhost:${port}/mockserver/status`, {
    method: "PUT",
    timeoutMs: 30_000,
  })

  process.env.MOCKSERVER_URL = `http://localhost:${port}/mockserver`

  return { container, port }
}

/**
 * Stops the MockServer Docker container using the standard naming
 * convention (`{prefix}-mockserver`).
 *
 * @param options - Optional overrides for the container name prefix
 *
 * @example
 * ```typescript
 * stopContainer()
 * ```
 */
export async function stopContainer(
  {
    prefix = process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
  }: Pick<MockServerOptions, "prefix"> = {
    prefix: process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
  },
): Promise<void> {
  await stop(`${prefix}-mockserver`)
}
