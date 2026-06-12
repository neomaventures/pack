/**
 * Matches the wire-format timestamp produced by `Date.prototype.toJSON()`
 * (which is what JSON.stringify calls on `HealthResult.checkedAt` at the
 * HTTP response boundary). Shared across the e2e specs that assert on the
 * `checkedAt` field of `/api/health` responses without needing to know
 * its exact value.
 */
export const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
