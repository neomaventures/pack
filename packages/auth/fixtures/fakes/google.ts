import { faker } from "@faker-js/faker"
import {
  type GoogleAuthOptions,
  type GoogleAuthResult,
} from "@neomaventures/auth"
import * as jwt from "jsonwebtoken"

const { hacker, internet, person, string } = faker

/**
 * Shape of a Google OAuth code exchange token response.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  id_token: string
}

type FakeGoogle = {
  /**
   * Returns a random client secret that looks like the one returned by successful authentication
   * with Google.
   *
   * @example
   * ```
   * abcdef-1234567890abcdefgh123ab1abcd1a1a-bcd1abcde
   * ```
   */
  clientSecret(): string

  /**
   * Returns a random client ID that looks like the one returned by successful authentication
   * with Google.
   *
   * @example
   * ```
   * 12345678910-abcdefgh123ab1abcd1a1abcd1abcde.apps.googleusercontent.com
   * ```
   */
  clientId(): string

  /**
   * Returns a random audience string that looks like the one returned by successful authentication
   * with Google.
   *
   * @example
   * ```
   * 12345678910-abcdefgh123ab1abcd1a1abcd1abcde.apps.googleusercontent.com
   * ```
   */
  aud(): string

  /**
   * Returns a random subject string that looks like the one returned by successful authentication
   * with Google.
   *
   * @example
   * ```
   * 1234567890
   * ```
   */
  sub(): string

  /**
   * Returns a code that looks like the one returned by successful authentication
   * with Google.
   *
   * @example
   * ```
   * 4/MTYzMjM0NTY3ODk2Nw.0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t
   * ```
   */
  code(): string

  /**
   * Returns a JWT similar to the one provided in the id_token property of the Google OAuth
   * code exchange response.
   *
   * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
   *
   * @param data - Optional claims to include in the JWT
   * @param data.iss - The issuer, defaults to https://accounts.google.com
   * @param data.sub - The subject, defaults to a random numeric string
   * @param data.aud - The audience, defaults to a random aud string
   * @param data.email - The email address, defaults to a random email
   * @param data.name - The name, defaults to a random name
   * @param data.picture - The profile picture URL, defaults to a random avatar
   * @returns The signed JWT
   */
  idToken(
    data?: Partial<{
      iss: string
      sub: string
      aud: string
      email: string
      email_verified: boolean
      name: string
      picture: string
    }> &
      Record<string, any>,
  ): string

  /**
   * Returns an access token that looks like the one returned by successful authentication
   * with Google.
   *
   * @example
   * ```
   * 1/MTYzMjM0NTY3ODk2Nw.0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t
   * ```
   */
  accessToken(): string

  /**
   * Returns a list of scopes that looks like the one returned by successful authentication
   * with Google.
   *
   * @example
   * ```
   * ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
   * ```
   */
  scopes(): Array<string>

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
  authResult(overrides?: Partial<GoogleAuthResult<any>>): GoogleAuthResult<any>

  /**
   * Returns a realistic Google OAuth token response containing the given ID token.
   *
   * @param idToken - The ID token to include in the response
   * @returns A complete token response object
   *
   * @example
   * ```typescript
   * const response = google.tokenResponse(google.idToken())
   * ```
   */
  tokenResponse(idToken: string): GoogleTokenResponse

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
  authOptions(overrides?: Partial<GoogleAuthOptions>): GoogleAuthOptions
}

export const google: FakeGoogle = {
  clientSecret(): string {
    return `${string.alpha(6)}-${string.alphanumeric(19)}-${string.alphanumeric(8)}`
  },

  clientId(): string {
    return `${string.numeric(11)}-${string.alphanumeric(31)}.apps.googleusercontent.com`
  },

  aud(): string {
    return google.clientId()
  },

  sub(): string {
    return string.numeric(10)
  },

  code(): string {
    return `4/${Buffer.from(hacker.phrase()).toString("base64")}`
  },

  idToken(
    data: Partial<{
      iss: string
      sub: string
      aud: string
      email: string
      email_verified: boolean
      name: string
      picture: string
    }> &
      Record<string, any> = {},
  ): string {
    const defaults = {
      iss: "https://accounts.google.com",
      sub: string.numeric(7),
      aud: google.aud(),
      email: internet.email(),
      name: person.fullName(),
      picture: internet.url(),
    }
    const claims = { ...defaults, ...data }
    const secret = string.alphanumeric(32)
    return jwt.sign(claims, secret)
  },

  accessToken(): string {
    return `1/${Buffer.from(hacker.phrase()).toString("base64")}`
  },

  scopes(): Array<string> {
    return [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ]
  },

  authResult(
    overrides: Partial<GoogleAuthResult<any>> = {},
  ): GoogleAuthResult<any> {
    return {
      entity: { id: string.uuid(), email: internet.email() },
      isNewUser: true,
      profile: {
        sub: string.numeric(10),
        name: person.fullName(),
        picture: internet.url(),
      },
      ...overrides,
    }
  },

  tokenResponse(idToken: string): GoogleTokenResponse {
    return {
      access_token: google.accessToken(),
      expires_in: 3600,
      token_type: "Bearer",
      scope: google.scopes().join(" "),
      id_token: idToken,
    }
  },

  authOptions(overrides: Partial<GoogleAuthOptions> = {}): GoogleAuthOptions {
    return {
      clientId: google.clientId(),
      clientSecret: google.clientSecret(),
      redirectUri: internet.url(),
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      ...overrides,
    }
  },
}
