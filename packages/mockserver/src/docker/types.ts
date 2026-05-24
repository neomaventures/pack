/**
 * Base options shared by all container start functions.
 */
export interface BaseOptions {
  /**
   * Prefix for the Docker container name. Defaults to the value of
   * `NEOMA_TEST_PREFIX` env var, or `"neoma-test"` if unset.
   */
  prefix?: string
  /**
   * Host port to bind the container to. Overrides the service-specific
   * env var (e.g. `MOCKSERVER_PORT`). Falls back to the service default
   * if neither this nor the env var is set.
   */
  port?: number
}

/**
 * Options that control how {@link waitForHttp} polls a container's
 * health endpoint.
 */
export interface HealthCheckOptions {
  /** Maximum number of retry attempts. Defaults to `30`. */
  retries?: number
  /** Milliseconds between retry attempts. Defaults to `1000`. */
  intervalMs?: number
  /** Total timeout in milliseconds. Defaults to `30000`. */
  timeoutMs?: number
  /** HTTP method to use for the health check request. Defaults to `"GET"`. */
  method?: "GET" | "PUT" | "POST" | "HEAD"
}
