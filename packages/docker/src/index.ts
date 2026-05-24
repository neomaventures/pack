// Health polling — block until a containerised service is accepting traffic
export { waitForHttp, waitForTcp } from "./health"

// Container teardown — idempotent `docker rm -f`
export { stopContainer } from "./stop"

// Shared option types
export type { BaseOptions, HealthCheckOptions } from "./types"
