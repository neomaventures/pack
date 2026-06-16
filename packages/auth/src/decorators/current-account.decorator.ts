/**
 * Parameter decorator that extracts the authenticated account from the
 * request context. Backed by `AsyncLocalStorage` via the account context
 * slot — reads the same value as `getAccount()`.
 *
 * Returns `undefined` when no account exists (e.g. unauthenticated request).
 * Use behind `@Authenticated()` to guarantee an account is present.
 *
 * Must be called with parentheses: `@CurrentAccount()`. The decorator name
 * is deliberately verbose to avoid colliding with the `Account` entity class
 * at the call site.
 *
 * @example
 * ```typescript
 * @Authenticated()
 * @Get("me")
 * public me(@CurrentAccount() account: Account): Account {
 *   return account
 * }
 * ```
 */
export { CurrentAccount } from "../account/account.slot"
