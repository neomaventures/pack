import { faker } from "@faker-js/faker"
import { google } from "@neomaventures/google-fixtures"
import { runInRequestContext } from "@neomaventures/request-context/testing"

import { setAccount } from "../account/account.slot"
import { Account } from "../entities/account.entity"
import { OAuthToken } from "../entities/oauth-token.entity"
import { type Authenticatable } from "../interfaces/authenticatable.interface"

export { setAccount } from "../account/account.slot"

/**
 * Runs `fn` inside an active request context with the given account seeded
 * into the auth account slot. Layers on top of
 * `runInRequestContext` — consumers writing auth-touching specs never
 * need to know about the underlying CLS or the `setAccount` primitive.
 *
 * @param account - The authenticated account to seed into the slot.
 * @param fn - The async function to run inside the auth context.
 * @returns Whatever `fn` returns.
 *
 * @example Assert a service reads the current account
 * ```typescript
 * import { runInAuthContext, entities } from "@neomaventures/auth/testing"
 *
 * const account = entities.account()
 * await runInAuthContext(account, async () => {
 *   await expect(service.doThing()).resolves.toBe(account.id)
 * })
 * ```
 */
export const runInAuthContext = async <A extends Authenticatable, T>(
  account: A,
  fn: () => Promise<T>,
): Promise<T> => {
  return runInRequestContext(async () => {
    setAccount(account)
    return fn()
  })
}

/**
 * A collection of factory functions for creating test entities. Each function
 * returns a real entity instance, so methods like `account.activeToken(provider)`
 * work as expected.
 */
export const entities = {
  /**
   * Creates a random {@link Account} instance for tests. Returned object is a
   * real `Account`, so methods like `activeToken(provider)` work as expected.
   *
   * Sensible defaults: random uuid `id`, lowercased `faker.internet.email()`,
   * fresh `createdAt`/`updatedAt`, empty `oauthTokens`, empty `permissions`.
   *
   * @param overrides - Partial overrides for any field. Anything not supplied
   *   falls back to the defaults above.
   *
   * @returns A fresh `Account` instance ready for use in unit and e2e tests.
   *
   * @example Default account
   * ```typescript
   * import entities from "@neomaventures/auth/testing"
   *
   * const account = entities.account()
   * ```
   *
   * @example Account with permissions and tokens
   * ```typescript
   * const account = entities.account({
   *   permissions: ["read:users"],
   *   oauthTokens: [entities.oauthToken()],
   * })
   * ```
   */
  account({
    id = faker.string.uuid(),
    email = faker.internet.email().toLowerCase(),
    permissions = [],
    oauthTokens = [],
    createdAt = new Date(),
    updatedAt = new Date(),
  }: Partial<Account> = {}): Account {
    return Object.assign(new Account(), {
      id,
      email,
      permissions,
      oauthTokens,
      createdAt,
      updatedAt,
    })
  },

  /**
   * Creates a random {@link OAuthToken} instance for tests.
   *
   * Sensible defaults: random uuid `id`, `provider: "google"`, access token
   * via `google.accessToken()` from `@neomaventures/google-fixtures`,
   * `refreshToken: null`, `expiresAt` one hour from now, scopes
   * `["openid", "email", "profile"]`.
   *
   * @param overrides - Partial overrides for any field.
   * @returns A fresh `OAuthToken` instance.
   *
   * @example
   * ```typescript
   * import entities from "@neomaventures/auth/testing"
   *
   * const account = entities.account({ oauthTokens: [entities.oauthToken()] })
   * ```
   */
  oauthToken({
    id = faker.string.uuid(),
    provider = "google",
    accessToken = google.accessToken(),
    refreshToken = null,
    expiresAt = new Date(Date.now() + 3600 * 1000),
    scopes = ["openid", "email", "profile"],
  }: Partial<OAuthToken> = {}): OAuthToken {
    return Object.assign(new OAuthToken(), {
      id,
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      scopes,
    })
  },
}
