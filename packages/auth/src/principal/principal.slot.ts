import { createContextSlot } from "@neomaventures/request-context"

import { type Account } from "../entities/account.entity"

/**
 * Context slot for the authenticated principal, backed by `AsyncLocalStorage`
 * via `@neomaventures/request-context`. The principal is always an
 * `Account` — auth ships the concrete entity, so there is no consumer
 * generic to thread through.
 *
 * ## Which form to use
 *
 * | Form | Where | Use case |
 * |------|-------|----------|
 * | `getPrincipal()` | Anywhere | Check existence, guards, non-DI sites |
 * | `@Principal()` | Controller params | Extract principal in handler methods |
 * | `@Inject(CurrentPrincipal)` | Constructor injection | Access principal in singleton services |
 *
 * **Important:** `@Inject(CurrentPrincipal)` provides a proxy object that is
 * always truthy — even when no principal is stored. Property access on the
 * proxy resolves to the per-request value, but you cannot use it for existence
 * checks (e.g. `if (!this.principal)` will never be true). Use `getPrincipal()`
 * when you need to check whether a principal exists.
 *
 * @example Check if a principal exists (guards, conditional logic)
 * ```typescript
 * import { getPrincipal } from "@neomaventures/auth"
 *
 * const principal = getPrincipal()
 * if (!principal) {
 *   throw new UnauthorizedException()
 * }
 * ```
 *
 * @example Extract in a controller method
 * ```typescript
 * import { Principal, Account } from "@neomaventures/auth"
 *
 * @Authenticated()
 * @Get("me")
 * public me(@Principal() account: Account): Account {
 *   return account
 * }
 * ```
 *
 * @example Inject into a singleton service (behind a guard)
 * ```typescript
 * import { CurrentPrincipal, Account } from "@neomaventures/auth"
 *
 * @Injectable()
 * export class BillingService {
 *   public constructor(
 *     @Inject(CurrentPrincipal) private readonly principal: Account,
 *   ) {}
 *
 *   public getOwnerId(): string {
 *     return this.principal.id // resolves per-request via proxy
 *   }
 * }
 * ```
 */
const principalSlot = createContextSlot<Account>(
  "@neomaventures/auth:principal",
)

export const getPrincipal = principalSlot.get
export const setPrincipal = principalSlot.set
export const Principal = principalSlot.param
export const CurrentPrincipal = principalSlot.token
export const principalProvider = principalSlot.provider
