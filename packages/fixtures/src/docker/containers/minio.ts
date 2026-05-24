import { execFileSync } from "child_process"

import { waitForHttp } from "../health"
import { stopContainer as stop } from "../stop"
import { type BaseOptions } from "../types"

const MINIO_IMAGE = "minio/minio:RELEASE.2025-09-07T16-13-09Z"
const DEFAULT_API_PORT = 9000
const DEFAULT_CONSOLE_PORT = 9001
const DEFAULT_BUCKET = "test-bucket"
const DEFAULT_PREFIX = "neoma-test"
const DEFAULT_ACCESS_KEY = "minioadmin"
const DEFAULT_SECRET_KEY = "minioadmin"
const DEFAULT_REGION = "us-east-1"

/**
 * Options for {@link startContainer}.
 *
 * MinIO exposes two ports (API and Console), so the inherited `port`
 * field from {@link BaseOptions} is unused. Use `apiPort` and
 * `consolePort` instead.
 */
export interface MinIOOptions extends Omit<BaseOptions, "port"> {
  /** Host port for the S3 API. Overrides `MINIO_PORT` env var, default `9000`. */
  apiPort?: number
  /** Host port for the web console. Overrides `MINIO_CONSOLE_PORT` env var, default `9001`. */
  consolePort?: number
  /** Name of the bucket to create after the container is healthy. Default `"test-bucket"`. */
  bucket?: string
}

/**
 * Configuration returned by {@link startContainer} describing
 * the running container.
 */
export interface MinIOConfig {
  /** The Docker container name. */
  container: string
  /** The host port MinIO S3 API is listening on. */
  apiPort: number
  /** The host port MinIO Console is listening on. */
  consolePort: number
  /** The name of the bucket that was created. */
  bucket: string
  /** The root access key used to authenticate. */
  accessKey: string
  /** The root secret key used to authenticate. */
  secretKey: string
}

/**
 * Starts a MinIO Docker container, waits for it to become healthy,
 * creates a bucket, and sets storage environment variables.
 *
 * The API port is read from the `MINIO_PORT` env var (default `9000`).
 * The Console port is read from the `MINIO_CONSOLE_PORT` env var (default `9001`).
 * The container name is `{prefix}-minio` where prefix defaults to
 * the `NEOMA_TEST_PREFIX` env var, or `"neoma-test"`.
 *
 * Any pre-existing container with the same name is removed first to
 * ensure a clean start.
 *
 * @param options - Optional overrides for ports, prefix, and bucket name
 * @returns The container name, ports, bucket, and credentials
 *
 * @example
 * ```typescript
 * const config = await startContainer()
 * // config.container === "neoma-test-minio"
 * // config.apiPort === 9000
 * // config.consolePort === 9001
 * // config.bucket === "test-bucket"
 * // process.env.STORAGE_ENDPOINT === "http://localhost:9000"
 * // process.env.STORAGE_REGION === "us-east-1"
 * // process.env.STORAGE_ACCESS_KEY === "minioadmin"
 * // process.env.STORAGE_SECRET_KEY === "minioadmin"
 * // process.env.STORAGE_BUCKET === "test-bucket"
 * // process.env.STORAGE_FORCE_PATH_STYLE === "true"
 * ```
 */
export async function startContainer(
  {
    prefix = process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
    apiPort = Number(process.env.MINIO_PORT) || DEFAULT_API_PORT,
    consolePort = Number(process.env.MINIO_CONSOLE_PORT) ||
      DEFAULT_CONSOLE_PORT,
    bucket = DEFAULT_BUCKET,
  }: MinIOOptions = {
    prefix: process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
    apiPort: Number(process.env.MINIO_PORT) || DEFAULT_API_PORT,
    consolePort: Number(process.env.MINIO_CONSOLE_PORT) || DEFAULT_CONSOLE_PORT,
    bucket: DEFAULT_BUCKET,
  },
): Promise<MinIOConfig> {
  const container = `${prefix}-minio`

  // Remove any stale container with the same name
  await stop(container)

  const args = [
    "run",
    "-d",
    "--name",
    container,
    "-p",
    `${apiPort}:9000`,
    "-p",
    `${consolePort}:9001`,
    "-e",
    `MINIO_ROOT_USER=${DEFAULT_ACCESS_KEY}`,
    "-e",
    `MINIO_ROOT_PASSWORD=${DEFAULT_SECRET_KEY}`,
    "--",
    MINIO_IMAGE,
    "server",
    "/data",
    "--console-address",
    ":9001",
  ]

  execFileSync("docker", args, { stdio: "ignore" })

  await waitForHttp(`http://localhost:${apiPort}/minio/health/live`, {
    timeoutMs: 30_000,
  })

  // Create the bucket using mc (MinIO Client CLI) inside the running
  // container. mc ships with the MinIO image, so no external dependency
  // is needed. Port 9000 is the internal container port — MinIO always
  // listens there regardless of the host port mapping.
  execFileSync(
    "docker",
    [
      "exec",
      container,
      "mc",
      "alias",
      "set",
      "local",
      "http://localhost:9000",
      DEFAULT_ACCESS_KEY,
      DEFAULT_SECRET_KEY,
    ],
    { stdio: "ignore" },
  )
  execFileSync("docker", ["exec", container, "mc", "mb", `local/${bucket}`], {
    stdio: "ignore",
  })

  process.env.STORAGE_ENDPOINT = `http://localhost:${apiPort}`
  process.env.STORAGE_REGION = DEFAULT_REGION
  process.env.STORAGE_ACCESS_KEY = DEFAULT_ACCESS_KEY
  process.env.STORAGE_SECRET_KEY = DEFAULT_SECRET_KEY
  process.env.STORAGE_BUCKET = bucket
  process.env.STORAGE_FORCE_PATH_STYLE = "true"

  return {
    container,
    apiPort,
    consolePort,
    bucket,
    accessKey: DEFAULT_ACCESS_KEY,
    secretKey: DEFAULT_SECRET_KEY,
  }
}

/**
 * Stops the MinIO Docker container using the standard naming
 * convention (`{prefix}-minio`).
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
  }: Pick<MinIOOptions, "prefix"> = {
    prefix: process.env.NEOMA_TEST_PREFIX ?? DEFAULT_PREFIX,
  },
): Promise<void> {
  await stop(`${prefix}-minio`)
}
