/**
 * Reflect-metadata key set by {@link HealthCheck} and read by
 * `HealthcheckInterceptor` to identify the decorated route at runtime.
 */
export const HEALTHCHECK_METADATA_KEY = "neoma:healthcheck"

/**
 * Hard ceiling on how long a single probe is allowed to take before
 * `HealthService.check()` reports it as `"error"`. Picked at 5 seconds:
 * long enough to absorb realistic network jitter, short enough that an
 * orchestrator's external timeout doesn't fire before ours.
 */
export const PROBE_TIMEOUT_MS = 5000

/**
 * Key under which `HealthcheckInterceptor` attaches the probe result on
 * the current request, so `@HealthStatus()` can extract it during the
 * pipes phase. Internal to the package — consumers use the parameter
 * decorator, not this key directly.
 */
export const HEALTHCHECK_REQUEST_KEY = "neoma:healthcheck:result"
