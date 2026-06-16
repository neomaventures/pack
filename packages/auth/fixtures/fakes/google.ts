import { faker } from "@faker-js/faker"
import {
  type GoogleAuthOptions,
  type GoogleAuthResult,
} from "@neomaventures/auth"
import { google as googleFakes } from "@neomaventures/google-fixtures"

import { account } from "./account"

const { internet, person, string } = faker

/**
 * Auth-specific Google test helpers that depend on `@neomaventures/auth` types.
 *
 * Data generators (code, idToken, sub, etc.) have moved to
 * `@neomaventures/google-fixtures` — import `google` instead.
 */
export const google = {
  /**
   * Returns a realistic {@link GoogleAuthResult} with faker data.
   *
   * @param overrides - Optional partial overrides for the result
   * @returns A complete GoogleAuthResult
   *
   * @example
   * ```typescript
   * const result = google.authResult()
   * const customResult = google.authResult({ isNewUser: false })
   * ```
   */
  authResult(overrides: Partial<GoogleAuthResult> = {}): GoogleAuthResult {
    return {
      entity: account(),
      isNewUser: true,
      profile: {
        sub: string.numeric(10),
        name: person.fullName(),
        picture: internet.url(),
      },
      ...overrides,
    }
  },

  /**
   * Returns realistic {@link GoogleAuthOptions} with faker data.
   *
   * @param overrides - Optional partial overrides for the options
   * @returns A complete GoogleAuthOptions object
   *
   * @example
   * ```typescript
   * const options = google.authOptions()
   * const custom = google.authOptions({ tokenEndpoint: "http://localhost/token" })
   * ```
   */
  authOptions(overrides: Partial<GoogleAuthOptions> = {}): GoogleAuthOptions {
    return {
      clientId: googleFakes.clientId(),
      clientSecret: googleFakes.clientSecret(),
      redirectUri: internet.url(),
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      ...overrides,
    }
  },
}
