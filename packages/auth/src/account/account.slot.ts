import { createContextSlot } from "@neomaventures/request-context"

import { type Account } from "../entities/account.entity"

/**
 * Context slot for the authenticated account, backed by `AsyncLocalStorage`
 * via `@neomaventures/request-context`. The slot always holds an
 * `Account` — auth ships the concrete entity, so there is no consumer
 * generic to thread through.
 *
 * ## Which form to use
 *
 * | Form | Where | Use case |
 * |------|-------|----------|
 * | `getAccount()` | Anywhere | Check existence, guards, non-DI sites |
 * | `@CurrentAccount()` | Controller params | Extract account in handler methods |
 * | `@Inject(CurrentAccountToken)` | Constructor injection | Access account in singleton services |
 *
 * **Important:** `@Inject(CurrentAccountToken)` provides a proxy object that is
 * always truthy — even when no account is stored. Property access on the
 * proxy resolves to the per-request value, but you cannot use it for existence
 * checks (e.g. `if (!this.account)` will never be true). Use `getAccount()`
 * when you need to check whether an account exists.
 *
 * @example Check if an account exists (guards, conditional logic)
 * ```typescript
 * import { getAccount } from "@neomaventures/auth"
 *
 * const account = getAccount()
 * if (!account) {
 *   throw new UnauthorizedException()
 * }
 * ```
 *
 * @example Extract in a controller method
 * ```typescript
 * import { CurrentAccount, Account } from "@neomaventures/auth"
 *
 * @Authenticated()
 * @Get("me")
 * public me(@CurrentAccount() account: Account): Account {
 *   return account
 * }
 * ```
 *
 * @example Inject into a singleton service (behind a guard)
 * ```typescript
 * import { CurrentAccountToken, Account } from "@neomaventures/auth"
 *
 * @Injectable()
 * export class BillingService {
 *   public constructor(
 *     @Inject(CurrentAccountToken) private readonly account: Account,
 *   ) {}
 *
 *   public getOwnerId(): string {
 *     return this.account.id // resolves per-request via proxy
 *   }
 * }
 * ```
 */
const accountSlot = createContextSlot<Account>("@neomaventures/auth:account")

export const getAccount = accountSlot.get
export const setAccount = accountSlot.set
export const CurrentAccount = accountSlot.param
export const CurrentAccountToken = accountSlot.token
export const accountProvider = accountSlot.provider
