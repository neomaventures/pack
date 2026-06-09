import { faker } from "@faker-js/faker"
import * as jwt from "jsonwebtoken"

import {
  type GoogleIdTokenClaims,
  type GoogleOAuthCodeExchangeResponse,
} from "./types"

const { hacker, internet, person, string } = faker

/**
 * Fake data generators for Google OAuth test values.
 *
 * Each method returns a realistic-looking value using `@faker-js/faker`.
 * Use these in both unit and e2e tests — no MockServer dependency required.
 *
 * @example
 * ```typescript
 * import { google } from "@neomaventures/google-fixtures"
 *
 * const code = google.code()
 * const token = google.idToken({ email: "dan@example.com" })
 * ```
 */
export const google = {
  /**
   * Returns a random Google OAuth client ID.
   *
   * @returns A string resembling a real Google client ID
   */
  clientId(): string {
    return `${string.numeric(11)}-${string.alphanumeric(31)}.apps.googleusercontent.com`
  },

  /**
   * Returns a random Google OAuth client secret.
   *
   * @returns A string resembling a real Google client secret
   */
  clientSecret(): string {
    return `${string.alpha(6)}-${string.alphanumeric(19)}-${string.alphanumeric(8)}`
  },

  /**
   * Returns a random audience string matching Google's format.
   * Delegates to {@link google.clientId} since Google uses the client ID as audience.
   *
   * @returns A string resembling a real Google audience value
   */
  aud(): string {
    return google.clientId()
  },

  /**
   * Returns a random Google subject identifier (numeric account ID).
   *
   * @returns A 10-digit numeric string
   */
  sub(): string {
    return string.numeric(10)
  },

  /**
   * Returns a random authorization code matching Google's format.
   *
   * @returns A string resembling a real Google authorization code
   */
  code(): string {
    return `4/${Buffer.from(hacker.phrase()).toString("base64")}`
  },

  /**
   * Returns a random Google OAuth access token.
   *
   * @returns A string resembling a real Google access token
   */
  accessToken(): string {
    return `1/${Buffer.from(hacker.phrase()).toString("base64")}`
  },

  /**
   * Returns a random Google OAuth refresh token.
   *
   * @returns A string resembling a real Google refresh token
   */
  refreshToken(): string {
    return `1//${Buffer.from(hacker.phrase()).toString("base64")}`
  },

  /**
   * Returns the standard Google OAuth scopes for profile and email access.
   *
   * @returns An array of OAuth scope URIs
   */
  scopes(): string[] {
    return [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ]
  },

  /**
   * Returns a signed JWT resembling a Google ID token.
   *
   * The token is signed with a random secret — it is not verifiable against
   * Google's public keys, but its structure and claims match the real thing.
   *
   * @param claims - Optional partial claims to override defaults
   * @returns A signed JWT string
   */
  idToken(claims: Partial<GoogleIdTokenClaims> = {}): string {
    const defaults = {
      iss: "https://accounts.google.com",
      sub: string.numeric(10),
      aud: google.aud(),
      email: internet.email(),
      name: person.fullName(),
      picture: internet.url(),
    }
    const merged = { ...defaults, ...claims }
    const secret = string.alphanumeric(32)
    return jwt.sign(merged, secret)
  },

  /**
   * Builds a complete Google OAuth code exchange response object
   * containing the given ID token.
   *
   * @param idToken - The ID token to embed in the response
   * @returns A complete {@link GoogleOAuthCodeExchangeResponse}
   */
  tokenResponse(idToken: string): GoogleOAuthCodeExchangeResponse {
    return {
      access_token: google.accessToken(),
      expires_in: 3600,
      token_type: "Bearer",
      scope: google.scopes().join(" "),
      id_token: idToken,
    }
  },
}
