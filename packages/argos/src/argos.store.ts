import { AsyncLocalStorage } from "async_hooks"

/**
 * AsyncLocalStorage instance that holds the current actor string
 * for the duration of each request.
 *
 * Populated by {@link ActorMiddleware}. Consumers can read it
 * directly, but prefer {@link getActor} for safe fallback.
 */
export const auditStore = new AsyncLocalStorage<{ actor: string }>()

/**
 * Returns the current actor string from the ALS context.
 *
 * Falls back to `"system"` when called outside a request
 * (e.g. cron jobs, startup hooks).
 *
 * @returns The actor string, e.g. `"principal:uuid"` or `"system"`
 *
 * @example
 * ```typescript
 * const actor = getActor() // "principal:abc123" or "system"
 * ```
 */
export const getActor = (): string => auditStore.getStore()?.actor ?? "system"
