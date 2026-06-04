/**
 * Parameter decorator that extracts the authenticated principal from the
 * request context. Backed by `AsyncLocalStorage` via the principal context
 * slot — reads the same value as `getPrincipal()`.
 *
 * Returns `undefined` when no principal exists (e.g. unauthenticated request).
 * Use behind `@UseGuards(Authenticated)` to guarantee a principal is present.
 *
 * Must be called with parentheses: `@Principal()`.
 *
 * @example
 * ```typescript
 * @UseGuards(Authenticated)
 * @Get("me")
 * public me(@Principal() user: User): User {
 *   return user
 * }
 * ```
 */
export { Principal } from "../principal/principal.slot"
