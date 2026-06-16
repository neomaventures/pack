import { faker } from "@faker-js/faker"
import { google } from "@neomaventures/google-fixtures"

import { Account } from "../entities/account.entity"
import { OAuthToken } from "../entities/oauth-token.entity"

/**
 * Creates a random {@link Account} instance for tests. Returned object is a
 * real `Account`, so methods like `activeToken(provider)` work as expected.
 *
 * Sensible defaults: random uuid `id`, lowercased `faker.internet.email()`,
 * fresh `createdAt`/`updatedAt`, empty `oauthTokens`, empty `permissions`.
 *
 * @param overrides - Partial overrides for any field. Anything not supplied
 *   falls back to the defaults above.
 * @returns A fresh `Account` instance ready for use in unit and e2e tests.
 *
 * @example Default account
 * ```typescript
 * import { fakeAccount } from "@neomaventures/auth/testing"
 *
 * const account = fakeAccount()
 * ```
 *
 * @example Account with permissions and tokens
 * ```typescript
 * const account = fakeAccount({
 *   permissions: ["read:users"],
 *   oauthTokens: [fakeOAuthToken()],
 * })
 * ```
 */
export function fakeAccount(overrides?: Partial<Account>): Account {
  const now = new Date()
  const account = new Account()
  account.id = faker.string.uuid()
  account.email = faker.internet.email().toLowerCase()
  account.permissions = []
  account.oauthTokens = []
  account.createdAt = now
  account.updatedAt = now
  Object.assign(account, overrides)
  return account
}

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
 * import { fakeAccount, fakeOAuthToken } from "@neomaventures/auth/testing"
 *
 * const account = fakeAccount({ oauthTokens: [fakeOAuthToken()] })
 * ```
 */
export function fakeOAuthToken(overrides?: Partial<OAuthToken>): OAuthToken {
  const token = new OAuthToken()
  token.id = faker.string.uuid()
  token.provider = "google"
  token.accessToken = google.accessToken()
  token.refreshToken = null
  token.expiresAt = new Date(Date.now() + 3600 * 1000)
  token.scopes = ["openid", "email", "profile"]
  Object.assign(token, overrides)
  return token
}
