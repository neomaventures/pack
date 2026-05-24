import { execFileSync } from "child_process"
import { existsSync, statSync } from "fs"

import { waitForTcp } from "../health"
import { stopContainer as stop } from "../stop"
import { type BaseOptions } from "../types"

const MAILPIT_IMAGE = "axllent/mailpit:v1.21"
const DEFAULT_SMTP_PORT = 1025
const DEFAULT_API_PORT = 8025
const DEFAULT_PREFIX = "neoma-test"

/**
 * Options for {@link startContainer}.
 *
 * Mailpit exposes two ports (SMTP and API), so the inherited `port`
 * field from {@link BaseOptions} is unused. Use `smtpPort` and
 * `apiPort` instead.
 */
export interface MailpitOptions extends Omit<BaseOptions, "port"> {
  /** Host port for the SMTP server. Overrides `MAILPIT_SMTP_PORT` env var, default `1025`. */
  smtpPort?: number
  /** Host port for the API server. Overrides `MAILPIT_API_PORT` env var, default `8025`. */
  apiPort?: number
  /** Absolute path to an htpasswd file for SMTP authentication. */
  htpasswd?: string
}

/**
 * Configuration returned by {@link startContainer} describing
 * the running container.
 */
export interface MailpitConfig {
  /** The Docker container name. */
  container: string
  /** The host port Mailpit SMTP is listening on. */
  smtpPort: number
  /** The host port Mailpit API is listening on. */
  apiPort: number
}

/**
 * Starts a Mailpit Docker container, waits for SMTP to become healthy,
 * and sets environment variables for SMTP and API access.
 *
 * The SMTP port is read from the `MAILPIT_SMTP_PORT` env var (default `1025`).
 * The API port is read from the `MAILPIT_API_PORT` env var (default `8025`).
 * The container name is `{prefix}-mailpit` where prefix defaults to
 * the `NEOMA_TEST_PREFIX` env var, or `"neoma-test"`.
 *
 * Any pre-existing container with the same name is removed first to
 * ensure a clean start.
 *
 * @param options - Optional overrides for ports, prefix, and auth
 * @returns The container name, SMTP port, and API port
 *
 * @example
 * ```typescript
 * const config = await startContainer()
 * // config.container === "neoma-test-mailpit"
 * // config.smtpPort === 1025
 * // config.apiPort === 8025
 * // process.env.SMTP_HOST === "localhost"
 * // process.env.SMTP_PORT === "1025"
 * // process.env.MAILPIT_API === "http://localhost:8025/api/v1"
 * ```
 */
export async function startContainer(
  {
    prefix = process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
    smtpPort = Number(process.env.MAILPIT_SMTP_PORT) || DEFAULT_SMTP_PORT,
    apiPort = Number(process.env.MAILPIT_API_PORT) || DEFAULT_API_PORT,
    htpasswd,
  }: MailpitOptions = {
    prefix: process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
    smtpPort: Number(process.env.MAILPIT_SMTP_PORT) || DEFAULT_SMTP_PORT,
    apiPort: Number(process.env.MAILPIT_API_PORT) || DEFAULT_API_PORT,
  },
): Promise<MailpitConfig> {
  const container = `${prefix}-mailpit`

  // Remove any stale container with the same name
  await stop(container)

  const args = [
    "run",
    "-d",
    "--name",
    container,
    "-p",
    `${smtpPort}:1025`,
    "-p",
    `${apiPort}:8025`,
  ]

  if (htpasswd) {
    if (!existsSync(htpasswd) || !statSync(htpasswd).isFile()) {
      throw new Error(
        `htpasswd path does not exist or is not a file: ${htpasswd}`,
      )
    }
    args.push("-v", `${htpasswd}:/auth.htpasswd:ro`)
  }

  args.push("--", MAILPIT_IMAGE)

  if (htpasswd) {
    args.push(
      "--smtp-auth-file",
      "/auth.htpasswd",
      "--smtp-auth-allow-insecure",
    )
  }

  execFileSync("docker", args, { stdio: "ignore" })

  await waitForTcp("localhost", smtpPort, {
    timeoutMs: 30_000,
  })

  process.env.SMTP_HOST = "localhost"
  process.env.SMTP_PORT = String(smtpPort)
  process.env.MAILPIT_API = `http://localhost:${apiPort}/api/v1`

  return { container, smtpPort, apiPort }
}

/**
 * Stops the Mailpit Docker container using the standard naming
 * convention (`{prefix}-mailpit`).
 *
 * @param options - Optional overrides for the container name prefix
 *
 * @example
 * ```typescript
 * await stopContainer()
 * ```
 */
export async function stopContainer(
  {
    prefix = process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
  }: Pick<MailpitOptions, "prefix"> = {
    prefix: process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
  },
): Promise<void> {
  await stop(`${prefix}-mailpit`)
}
