import { faker } from "@faker-js/faker"
import * as jwt from "jsonwebtoken"

import {
  type GoogleIdTokenClaims,
  type GoogleOAuthCodeExchangeResponse,
} from "./types"

const { hacker, internet, person, string } = faker

/**
 * Static data generators and MockServer helpers for Google OAuth test fixtures.
 *
 * Data generators produce realistic-looking Google OAuth values using
 * `@faker-js/faker`. MockServer helpers (added in a later slice) register
 * expectations on a running MockServer instance.
 *
 * @example
 * ```typescript
 * import { GoogleOAuth } from "@neomaventures/google-fixtures"
 *
 * const code = GoogleOAuth.code()
 * const token = GoogleOAuth.idToken({ email: "dan@example.com" })
 * ```
 */
export class GoogleOAuth {
  /**
   * Returns a random Google OAuth client ID.
   *
   * @returns A string resembling a real Google client ID
   *
   * @example
   * ```typescript
   * GoogleOAuth.clientId()
   * // => "12345678910-abcdefgh123ab1abcd1a1abcd1abcde.apps.googleusercontent.com"
   * ```
   */
  public static clientId(): string {
    return `${string.numeric(11)}-${string.alphanumeric(31)}.apps.googleusercontent.com`
  }

  /**
   * Returns a random Google OAuth client secret.
   *
   * @returns A string resembling a real Google client secret
   *
   * @example
   * ```typescript
   * GoogleOAuth.clientSecret()
   * // => "abcdef-1234567890abcdefgh123ab1abcd1a1a-bcd1abcde"
   * ```
   */
  public static clientSecret(): string {
    return `${string.alpha(6)}-${string.alphanumeric(19)}-${string.alphanumeric(8)}`
  }

  /**
   * Returns a random audience string matching Google's format.
   * Delegates to {@link clientId} since Google uses the client ID as audience.
   *
   * @returns A string resembling a real Google audience value
   *
   * @example
   * ```typescript
   * GoogleOAuth.aud()
   * // => "12345678910-abcdefgh123ab1abcd1a1abcd1abcde.apps.googleusercontent.com"
   * ```
   */
  public static aud(): string {
    return GoogleOAuth.clientId()
  }

  /**
   * Returns a random Google subject identifier (numeric account ID).
   *
   * @returns A 10-digit numeric string
   *
   * @example
   * ```typescript
   * GoogleOAuth.sub()
   * // => "1234567890"
   * ```
   */
  public static sub(): string {
    return string.numeric(10)
  }

  /**
   * Returns a random authorization code matching Google's format.
   *
   * @returns A string resembling a real Google authorization code
   *
   * @example
   * ```typescript
   * GoogleOAuth.code()
   * // => "4/MTYzMjM0NTY3ODk2Nw..."
   * ```
   */
  public static code(): string {
    return `4/${Buffer.from(hacker.phrase()).toString("base64")}`
  }

  /**
   * Returns a random Google OAuth access token.
   *
   * @returns A string resembling a real Google access token
   *
   * @example
   * ```typescript
   * GoogleOAuth.accessToken()
   * // => "1/MTYzMjM0NTY3ODk2Nw..."
   * ```
   */
  public static accessToken(): string {
    return `1/${Buffer.from(hacker.phrase()).toString("base64")}`
  }

  /**
   * Returns a random Google OAuth refresh token.
   *
   * @returns A string resembling a real Google refresh token
   *
   * @example
   * ```typescript
   * GoogleOAuth.refreshToken()
   * // => "1//MTYzMjM0NTY3ODk2Nw..."
   * ```
   */
  public static refreshToken(): string {
    return `1//${Buffer.from(hacker.phrase()).toString("base64")}`
  }

  /**
   * Returns the standard Google OAuth scopes for profile and email access.
   *
   * @returns An array of OAuth scope URIs
   *
   * @example
   * ```typescript
   * GoogleOAuth.scopes()
   * // => ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
   * ```
   */
  public static scopes(): string[] {
    return [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ]
  }

  /**
   * Returns a signed JWT resembling a Google ID token.
   *
   * The token is signed with a random secret — it is not verifiable against
   * Google's public keys, but its structure and claims match the real thing.
   *
   * @param claims - Optional partial claims to override defaults
   * @returns A signed JWT string
   *
   * @example
   * ```typescript
   * const token = GoogleOAuth.idToken({ email: "dan@example.com" })
   * const decoded = jwt.decode(token)
   * // decoded.email === "dan@example.com"
   * ```
   */
  public static idToken(claims: Partial<GoogleIdTokenClaims> = {}): string {
    const defaults = {
      iss: "https://accounts.google.com",
      sub: string.numeric(7),
      aud: GoogleOAuth.aud(),
      email: internet.email(),
      name: person.fullName(),
      picture: internet.url(),
    }
    const merged = { ...defaults, ...claims }
    const secret = string.alphanumeric(32)
    return jwt.sign(merged, secret)
  }

  /**
   * Builds a complete Google OAuth code exchange response object
   * containing the given ID token.
   *
   * @param idToken - The ID token to embed in the response
   * @returns A complete {@link GoogleOAuthCodeExchangeResponse}
   *
   * @example
   * ```typescript
   * const response = GoogleOAuth.tokenResponse(GoogleOAuth.idToken())
   * // response.access_token, response.id_token, etc.
   * ```
   */
  public static tokenResponse(
    idToken: string,
  ): GoogleOAuthCodeExchangeResponse {
    return {
      access_token: GoogleOAuth.accessToken(),
      expires_in: 3600,
      token_type: "Bearer",
      scope: GoogleOAuth.scopes().join(" "),
      id_token: idToken,
    }
  }
}
