/**
 * Parameter decorator that extracts the authenticated account from the
 * request context. Backed by `AsyncLocalStorage` via the account context
 * slot — reads the same value as `getAccount()`.
 *
 * Returns `undefined` when no account exists (e.g. unauthenticated request).
 * Use behind `@Authenticated()` to guarantee an account is present.
 *
 * Must be called with parentheses: `@AuthenticatedAccount()`. Pairs with
 * the `@Authenticated()` guard — they form a coherent contract together.
 *
 * @example
 * ```typescript
 * @Authenticated()
 * @Get("me")
 * public me(@AuthenticatedAccount() account: Account): Account {
 *   return account
 * }
 * ```
 */
export { AuthenticatedAccount } from "../account/account.slot"
