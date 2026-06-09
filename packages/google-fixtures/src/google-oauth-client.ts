import {
  type MockServerClient,
  type MockserverSpecificTimes,
  type MockserverUnlimitedTimes,
  MockserverBodyTypes,
  MockserverMatchTypes,
} from "@neomaventures/mockserver"

import { google } from "./google"
import {
  type GoogleOAuthCodeExchangeError,
  type GoogleOAuthCodeExchangeResponse,
} from "./types"

/**
 * MockServer helper for Google OAuth token endpoint expectations.
 *
 * Wraps a {@link MockServerClient} and provides methods to register
 * expectations for Google's `POST /token` endpoint.
 *
 * @example
 * ```typescript
 * import { GoogleOAuthClient } from "@neomaventures/google-fixtures"
 * import { MockServerClient } from "@neomaventures/mockserver"
 *
 * const mockserver = new MockServerClient("http://localhost:1080/mockserver")
 * const googleOAuth = new GoogleOAuthClient(mockserver)
 *
 * const tokens = await googleOAuth.mockCodeExchange({
 *   code: google.code(),
 *   clientId: "...",
 *   clientSecret: "...",
 *   redirectUri: "http://localhost:3000/callback",
 * })
 * ```
 */
export class GoogleOAuthClient {
  /**
   * @param client - A {@link MockServerClient} connected to the running instance
   */
  public constructor(private readonly client: MockServerClient) {}

  /**
   * Returns the mock token endpoint URL that your app should use
   * as its Google token endpoint during tests.
   *
   * @returns The token endpoint URL (e.g. `http://localhost:1080/token`)
   *
   * @example
   * ```typescript
   * googleOAuth.tokenEndpoint()
   * // => "http://localhost:1080/token"
   * ```
   */
  public tokenEndpoint(): string {
    return `${this.client.baseUrl.replace(/\/mockserver$/, "")}/token`
  }

  /**
   * Registers a MockServer expectation for a successful Google OAuth
   * code exchange (`POST /token`).
   *
   * Matches on all five form parameters (`code`, `client_id`, `client_secret`,
   * `redirect_uri`, `grant_type`) so a misconfigured test fails loudly.
   *
   * @param params - The request parameters and optional response overrides
   * @param params.code - The authorization code to match
   * @param params.clientId - The OAuth client ID to match
   * @param params.clientSecret - The OAuth client secret to match
   * @param params.redirectUri - The redirect URI to match
   * @param params.grantType - The grant type to match (defaults to `"authorization_code"`)
   * @param params.idToken - The ID token to return (defaults to {@link google.idToken})
   * @param params.refreshToken - An optional refresh token to include
   * @param params.times - How many times to match (defaults to `{ remainingTimes: 1 }`)
   * @returns The response object so tests can inspect the returned tokens
   */
  public async mockCodeExchange(params: {
    code: string
    clientId: string
    clientSecret: string
    redirectUri: string
    grantType?: string
    idToken?: string
    refreshToken?: string
    times?: MockserverSpecificTimes | MockserverUnlimitedTimes
  }): Promise<GoogleOAuthCodeExchangeResponse> {
    const response: GoogleOAuthCodeExchangeResponse = {
      access_token: google.accessToken(),
      expires_in: 3600,
      token_type: "Bearer",
      scope: google.scopes().join(" "),
      id_token: params.idToken ?? google.idToken(),
      ...(params.refreshToken !== undefined && {
        refresh_token: params.refreshToken,
      }),
    }

    await this.client.createExpectation({
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
   * @param params - The request parameters and optional error overrides
   * @param params.code - The authorization code to match
   * @param params.statusCode - The HTTP status code to return (defaults to `400`)
   * @param params.error - The error name (defaults to `"invalid_grant"`)
   * @param params.errorDescription - The error description (defaults to `"Bad Request"`)
   * @param params.times - How many times to match (defaults to `{ remainingTimes: 1 }`)
   * @returns The error response shape so tests can assert against it
   */
  public async mockCodeExchangeHttpError(params: {
    code: string
    statusCode?: number
    error?: string
    errorDescription?: string
    times?: MockserverSpecificTimes | MockserverUnlimitedTimes
  }): Promise<GoogleOAuthCodeExchangeError> {
    const statusCode = params.statusCode ?? 400
    const body = {
      error: params.error ?? "invalid_grant",
      error_description: params.errorDescription ?? "Bad Request",
    }

    await this.client.createExpectation({
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
   * @param params - The request parameters
   * @param params.code - The authorization code to match
   * @param params.times - How many times to match (defaults to `{ remainingTimes: 1 }`)
   */
  public async mockCodeExchangeNetworkError(params: {
    code: string
    times?: MockserverSpecificTimes | MockserverUnlimitedTimes
  }): Promise<void> {
    await this.client.createExpectation({
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
