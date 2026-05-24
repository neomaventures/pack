import { faker } from "@faker-js/faker"
import {
  MockServerClient,
  MockserverBodyTypes,
  MockserverMatchTypes,
} from "@neoma/mockserver"

import { google } from "../fakes/google"

const { hacker } = faker

/**
 * Derives the MockServer base URL (where expectations are served)
 * from the management API URL (MOCKSERVER_URL).
 *
 * @example
 * ```
 * "http://localhost:1080/mockserver" -> "http://localhost:1080"
 * ```
 */
function getBaseUrl(): string {
  const managementUrl = process.env.MOCKSERVER_URL!
  return managementUrl.replace(/\/mockserver$/, "")
}

/**
 * Returns the full token endpoint URL that should be used as
 * `googleAuth.tokenEndpoint` in test configuration.
 *
 * @returns The URL in the form `http://localhost:{port}/token`
 *
 * @example
 * ```typescript
 * GarmrModule.forRoot({
 *   googleAuth: {
 *     tokenEndpoint: getTokenEndpoint(),
 *     // ...
 *   },
 * })
 * ```
 */
export function getTokenEndpoint(): string {
  return `${getBaseUrl()}/token`
}

/**
 * The response type for a successful Google OAuth code exchange.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
export type GoogleOAuthCodeExchangeResponse = {
  /** The access token for accessing Google APIs */
  access_token: string
  /** Token lifetime in seconds */
  expires_in: number
  /** Token type, typically "Bearer" */
  token_type: string
  /** The OAuth scopes granted */
  scope: string
  /** The ID token containing user profile claims */
  id_token: string
}

/**
 * The response type for a Google OAuth code exchange error.
 */
export type GoogleOAuthCodeExchangeError = {
  /** The HTTP status code */
  statusCode: number
  /** The error response body */
  body: {
    error: string
    error_description: string
  }
}

/**
 * Mocks a successful Google OAuth code exchange.
 *
 * Configures MockServer to respond to `POST /token` with a valid token
 * response when the request body contains the specified authorization code.
 *
 * @param code - The authorization code to match
 * @param options - Optional overrides for the response fields
 * @param options.id_token - Custom ID token (defaults to a random one via google.idToken())
 * @returns The response object so tests can inspect the id_token
 *
 * @example
 * ```typescript
 * const code = google.code()
 * const response = await mockCodeExchangeApi(code)
 * const decoded = jwt.decode(response.id_token)
 * ```
 */
export async function mockCodeExchangeApi(
  code: string,
  options: { id_token?: string } = {},
): Promise<GoogleOAuthCodeExchangeResponse> {
  const client = new MockServerClient(process.env.MOCKSERVER_URL!)

  const response: GoogleOAuthCodeExchangeResponse = {
    access_token: google.accessToken(),
    expires_in: 3600,
    token_type: "Bearer",
    scope: google.scopes().join(" "),
    id_token: options.id_token ?? google.idToken(),
  }

  await client.createExpectation({
    httpRequest: {
      path: "/token",
      method: "POST",
      body: {
        type: MockserverBodyTypes.Form,
        parameters: {
          code: [code],
        },
        matchType: MockserverMatchTypes.OnlyMatchingFields,
      },
    },
    httpResponse: {
      statusCode: 200,
      body: JSON.stringify(response),
    },
    times: { unlimited: true },
  })

  return response
}

/**
 * Mocks an HTTP error response from Google's token endpoint.
 *
 * @param code - The authorization code to match
 * @param options - Optional overrides for error details
 * @param options.statusCode - HTTP status code (defaults to 500)
 * @param options.error - Error name
 * @param options.error_description - Error description
 *
 * @example
 * ```typescript
 * await mockCodeExchangeApiHttpError(code, { statusCode: 400 })
 * ```
 */
export async function mockCodeExchangeApiHttpError(
  code: string,
  options: {
    statusCode?: number
    error?: string
    error_description?: string
  } = {},
): Promise<void> {
  const client = new MockServerClient(process.env.MOCKSERVER_URL!)

  const statusCode = options.statusCode ?? 500
  const body = {
    error: options.error ?? hacker.ingverb(),
    error_description: options.error_description ?? hacker.phrase(),
  }

  await client.createExpectation({
    httpRequest: {
      path: "/token",
      method: "POST",
      body: {
        type: MockserverBodyTypes.Form,
        parameters: {
          code: [code],
        },
        matchType: MockserverMatchTypes.OnlyMatchingFields,
      },
    },
    httpResponse: {
      statusCode,
      body: JSON.stringify(body),
    },
    times: { unlimited: true },
  })
}

/**
 * Mocks a network error (dropped connection) from Google's token endpoint.
 *
 * @param code - The authorization code to match
 *
 * @example
 * ```typescript
 * await mockCodeExchangeApiNetworkError(code)
 * ```
 */
export async function mockCodeExchangeApiNetworkError(
  code: string,
): Promise<void> {
  const client = new MockServerClient(process.env.MOCKSERVER_URL!)

  await client.createExpectation({
    httpRequest: {
      path: "/token",
      method: "POST",
      body: {
        type: MockserverBodyTypes.Form,
        parameters: {
          code: [code],
        },
        matchType: MockserverMatchTypes.OnlyMatchingFields,
      },
    },
    httpError: {
      dropConnection: true,
    },
    times: { unlimited: true },
  })
}
