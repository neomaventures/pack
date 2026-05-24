import { createConnection } from "net"

import { type HealthCheckOptions } from "./types"

const DEFAULT_RETRIES = 30
const DEFAULT_INTERVAL_MS = 1000
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_METHOD = "GET"

/**
 * Probes a TCP port until a connection succeeds, or the
 * timeout / retry limit is exceeded.
 *
 * Designed for use inside container start functions to block until
 * the containerised service is accepting TCP connections (e.g. SMTP).
 *
 * @param host - The hostname to connect to
 * @param port - The TCP port to probe
 * @param options - Retry, interval, and timeout overrides
 * @returns Resolves when a TCP connection succeeds
 * @throws {Error} If the health check does not succeed within the
 *   configured retries / timeout
 *
 * @example
 * ```typescript
 * await waitForTcp("localhost", 1025, {
 *   timeoutMs: 15_000,
 * })
 * ```
 */
export async function waitForTcp(
  host: string,
  port: number,
  {
    retries = DEFAULT_RETRIES,
    intervalMs = DEFAULT_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: Omit<HealthCheckOptions, "method"> = {
    retries: DEFAULT_RETRIES,
    intervalMs: DEFAULT_INTERVAL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  },
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  for (let attempt = 0; attempt < retries; attempt++) {
    if (Date.now() >= deadline) {
      break
    }

    const connected = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ host, port }, () => {
        socket.destroy()
        resolve(true)
      })
      socket.setTimeout(intervalMs, () => {
        socket.destroy()
        resolve(false)
      })
      socket.on("error", () => {
        socket.destroy()
        resolve(false)
      })
    })

    if (connected) {
      return
    }

    if (attempt < retries - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  throw new Error(
    `Health check failed: TCP ${host}:${port} did not accept a connection within ${timeoutMs}ms / ${retries} retries`,
  )
}

/**
 * Polls an HTTP endpoint until it returns a 2xx status code, or the
 * timeout / retry limit is exceeded.
 *
 * Designed for use inside container start functions to block until
 * the containerised service is ready to accept traffic.
 *
 * @param url - The URL to poll
 * @param options - Retry, interval, timeout, and HTTP method overrides
 * @returns Resolves when a 2xx response is received
 * @throws {Error} If the health check does not succeed within the
 *   configured retries / timeout
 *
 * @example
 * ```typescript
 * await waitForHttp("http://localhost:1080/mockserver/status", {
 *   method: "PUT",
 *   timeoutMs: 15_000,
 * })
 * ```
 */
export async function waitForHttp(
  url: string,
  {
    retries = DEFAULT_RETRIES,
    intervalMs = DEFAULT_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    method = DEFAULT_METHOD,
  }: HealthCheckOptions = {
    retries: DEFAULT_RETRIES,
    intervalMs: DEFAULT_INTERVAL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    method: DEFAULT_METHOD,
  },
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  for (let attempt = 0; attempt < retries; attempt++) {
    if (Date.now() >= deadline) {
      break
    }

    const remainingMs = deadline - Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      Math.min(intervalMs, remainingMs),
    )

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
      })
      if (response.ok) {
        clearTimeout(timeout)
        return
      }
    } catch {
      // Connection refused, network error, or aborted — keep retrying
    } finally {
      clearTimeout(timeout)
    }

    if (attempt < retries - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  throw new Error(
    `Health check failed: ${method} ${url} did not return 2xx within ${timeoutMs}ms / ${retries} retries`,
  )
}
