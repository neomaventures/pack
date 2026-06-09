import { faker } from "@faker-js/faker"
import {
  type MockServerClient,
  type MockserverSpecificTimes,
  type MockserverUnlimitedTimes,
  MockserverBodyTypes,
  MockserverMatchTypes,
} from "@neomaventures/mockserver"
import * as jwt from "jsonwebtoken"

import {
  type GoogleIdTokenClaims,
  type GoogleOAuthCodeExchangeError,
  type GoogleOAuthCodeExchangeResponse,
} from "./types"

const { hacker, internet, person, string } = faker

/**
 * Static data generators and MockServer helpers for Google OAuth test fixtures.
 *
 * Data generators produce realistic-looking Google OAuth values using
 * `@faker-js/faker`. MockServer helpers register expectations on a running
 * MockServer instance for e2e testing.
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

  // ---------------------------------------------------------------------------
  // MockServer helpers
  // ---------------------------------------------------------------------------

  /**
   * Derives the token endpoint URL from a MockServer management URL.
   *
   * Strips the `/mockserver` suffix and appends `/token`, producing a URL
   * that your app can use as its Google token endpoint during tests.
   *
   * @param mockserverBaseUrl - The MockServer management URL
   *   (e.g. `http://localhost:1080/mockserver`)
   * @returns The token endpoint URL (e.g. `http://localhost:1080/token`)
   *
   * @example
   * ```typescript
   * GoogleOAuth.tokenEndpoint("http://localhost:1080/mockserver")
   * // => "http://localhost:1080/token"
   * ```
   */
  public static tokenEndpoint(mockserverBaseUrl: string): string {
    return `${mockserverBaseUrl.replace(/\/mockserver$/, "")}/token`
  }

  /**
   * Registers a MockServer expectation for a successful Google OAuth
   * code exchange (`POST /token`).
   *
   * Matches on all five form parameters (`code`, `client_id`, `client_secret`,
   * `redirect_uri`, `grant_type`) so a misconfigured test fails loudly.
   *
   * @param client - A {@link MockServerClient} connected to the running instance
   * @param params - The request parameters and optional response overrides
   * @param params.code - The authorization code to match
   * @param params.clientId - The OAuth client ID to match
   * @param params.clientSecret - The OAuth client secret to match
   * @param params.redirectUri - The redirect URI to match
   * @param params.grantType - The grant type to match (defaults to `"authorization_code"`)
   * @param params.idToken - The ID token to return (defaults to {@link GoogleOAuth.idToken})
   * @param params.refreshToken - An optional refresh token to include
   * @param params.times - How many times to match (defaults to `{ remainingTimes: 1 }`)
   * @returns The response object so tests can inspect the returned tokens
   *
   * @example
   * ```typescript
   * const response = await GoogleOAuth.mockCodeExchange(client, {
   *   code,
   *   clientId: "...",
   *   clientSecret: "...",
   *   redirectUri: "http://localhost:3000/callback",
   * })
   * ```
   */
  public static async mockCodeExchange(
    client: MockServerClient,
    params: {
      code: string
      clientId: string
      clientSecret: string
      redirectUri: string
      grantType?: string
      idToken?: string
      refreshToken?: string
      times?: MockserverSpecificTimes | MockserverUnlimitedTimes
    },
  ): Promise<GoogleOAuthCodeExchangeResponse> {
    const response: GoogleOAuthCodeExchangeResponse = {
      access_token: GoogleOAuth.accessToken(),
      expires_in: 3600,
      token_type: "Bearer",
      scope: GoogleOAuth.scopes().join(" "),
      id_token: params.idToken ?? GoogleOAuth.idToken(),
    }

    await client.createExpectation({
      httpRequest: {
        path: "/token",
        method: "POST",
        body: {
          type: MockserverBodyTypes.Form,
          parameters: {
            code: [params.code],
            client_id: [params.clientId],
            client_secret: [params.clientSecret],
            redirect_uri: [params.redirectUri],
            grant_type: [params.grantType ?? "authorization_code"],
          },
          matchType: MockserverMatchTypes.OnlyMatchingFields,
        },
      },
      httpResponse: {
        statusCode: 200,
        body: JSON.stringify(response),
      },
      times: params.times ?? { remainingTimes: 1 },
    })

    return response
  }

  /**
   * Registers a MockServer expectation for an HTTP error from Google's
   * token endpoint.
   *
   * @param client - A {@link MockServerClient} connected to the running instance
   * @param params - The request parameters and optional error overrides
   * @param params.code - The authorization code to match
   * @param params.statusCode - The HTTP status code to return (defaults to `400`)
   * @param params.error - The error name (defaults to `"invalid_grant"`)
   * @param params.errorDescription - The error description (defaults to `"Bad Request"`)
   * @param params.times - How many times to match (defaults to `{ remainingTimes: 1 }`)
   * @returns The error response shape so tests can assert against it
   *
   * @example
   * ```typescript
   * const error = await GoogleOAuth.mockCodeExchangeHttpError(client, {
   *   code,
   *   statusCode: 401,
   *   error: "invalid_grant",
   * })
   * ```
   */
  public static async mockCodeExchangeHttpError(
    client: MockServerClient,
    params: {
      code: string
      statusCode?: number
      error?: string
      errorDescription?: string
      times?: MockserverSpecificTimes | MockserverUnlimitedTimes
    },
  ): Promise<GoogleOAuthCodeExchangeError> {
    const statusCode = params.statusCode ?? 400
    const body = {
      error: params.error ?? "invalid_grant",
      error_description: params.errorDescription ?? "Bad Request",
    }

    await client.createExpectation({
      httpRequest: {
        path: "/token",
        method: "POST",
        body: {
          type: MockserverBodyTypes.Form,
          parameters: {
            code: [params.code],
          },
          matchType: MockserverMatchTypes.OnlyMatchingFields,
        },
      },
      httpResponse: {
        statusCode,
        body: JSON.stringify(body),
      },
      times: params.times ?? { remainingTimes: 1 },
    })

    return { statusCode, body }
  }

  /**
   * Registers a MockServer expectation that simulates a network error
   * (dropped connection) from Google's token endpoint.
   *
   * @param client - A {@link MockServerClient} connected to the running instance
   * @param params - The request parameters
   * @param params.code - The authorization code to match
   * @param params.times - How many times to match (defaults to `{ remainingTimes: 1 }`)
   *
   * @example
   * ```typescript
   * await GoogleOAuth.mockCodeExchangeNetworkError(client, { code })
   * ```
   */
  public static async mockCodeExchangeNetworkError(
    client: MockServerClient,
    params: {
      code: string
      times?: MockserverSpecificTimes | MockserverUnlimitedTimes
    },
  ): Promise<void> {
    await client.createExpectation({
      httpRequest: {
        path: "/token",
        method: "POST",
        body: {
          type: MockserverBodyTypes.Form,
          parameters: {
            code: [params.code],
          },
          matchType: MockserverMatchTypes.OnlyMatchingFields,
        },
      },
      httpError: {
        dropConnection: true,
      },
      times: params.times ?? { remainingTimes: 1 },
    })
  }
}
