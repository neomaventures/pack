import {
  type MockServerClient,
  type MockserverSpecificTimes,
  type MockserverUnlimitedTimes,
} from "@neomaventures/mockserver"

import { gmail, type GmailLabel } from "./gmail"

/**
 * MockServer helper for Gmail API endpoint expectations.
 *
 * Wraps a {@link MockServerClient} and provides domain-shaped methods
 * to register expectations for Gmail's REST endpoints — callers don't
 * have to know about HTTP paths, methods, or `Authorization` header
 * shapes.
 *
 * @example
 * ```typescript
 * import { GmailClient } from "@neomaventures/google-fixtures"
 * import { MockServerClient } from "@neomaventures/mockserver"
 *
 * const mockserver = new MockServerClient("http://localhost:1080/mockserver")
 * const gmailClient = new GmailClient(mockserver)
 *
 * await gmailClient.expectLabel({
 *   labelId: "INBOX",
 *   token: "ya29.test",
 *   label: gmail.label({ id: "INBOX" }),
 * })
 * ```
 */
export class GmailClient {
  /**
   * @param client - A {@link MockServerClient} connected to the running instance
   */
  public constructor(private readonly client: MockServerClient) {}

  /**
   * Returns the base URL apps should use as their Gmail API base URL
   * during tests (the MockServer base, stripped of the `/mockserver`
   * management suffix).
   *
   * @returns The Gmail API base URL (e.g. `http://localhost:1080`)
   *
   * @example
   * ```typescript
   * gmailClient.baseUrl()
   * // => "http://localhost:1080"
   * ```
   */
  public baseUrl(): string {
    return this.client.baseUrl.replace(/\/mockserver$/, "")
  }

  /**
   * Registers a MockServer expectation for a successful Gmail labels
   * fetch (`GET /gmail/v1/users/me/labels/{labelId}`).
   *
   * Matches on both the label-id path segment and the `Authorization`
   * bearer token so a misconfigured test fails loudly.
   *
   * @param params - The request parameters and the label to return
   * @param params.labelId - The Gmail label ID to match in the path
   * @param params.token - The OAuth access token to match in the
   *   `Authorization` header
   * @param params.label - The {@link GmailLabel} to return as the response body
   * @param params.times - How many times to match (defaults to `{ remainingTimes: 1 }`)
   * @returns The label object so tests can assert against it
   */
  public async expectLabel(params: {
    labelId: string
    token: string
    label: GmailLabel
    times?: MockserverSpecificTimes | MockserverUnlimitedTimes
  }): Promise<GmailLabel> {
    await this.client.createExpectation({
      httpRequest: {
        path: `/gmail/v1/users/me/labels/${encodeURIComponent(params.labelId)}`,
        method: "GET",
        headers: {
          Authorization: [`Bearer ${params.token}`],
        },
      },
      httpResponse: {
        statusCode: 200,
        body: JSON.stringify(params.label),
      },
      times: params.times ?? { remainingTimes: 1 },
    })

    return params.label
  }

  /**
   * Registers a MockServer expectation for an HTTP error from the
   * Gmail labels endpoint.
   *
   * @param params - The request parameters and error overrides
   * @param params.labelId - The Gmail label ID to match in the path
   * @param params.token - The OAuth access token to match in the
   *   `Authorization` header
   * @param params.statusCode - The HTTP status code to return (e.g. `401`, `404`)
   * @param params.message - The error message to include in the response body
   * @param params.times - How many times to match (defaults to `{ remainingTimes: 1 }`)
   */
  public async expectLabelError(params: {
    labelId: string
    token: string
    statusCode: number
    message: string
    times?: MockserverSpecificTimes | MockserverUnlimitedTimes
  }): Promise<void> {
    await this.client.createExpectation({
      httpRequest: {
        path: `/gmail/v1/users/me/labels/${encodeURIComponent(params.labelId)}`,
        method: "GET",
        headers: {
          Authorization: [`Bearer ${params.token}`],
        },
      },
      httpResponse: {
        statusCode: params.statusCode,
        body: JSON.stringify({
          error: { code: params.statusCode, message: params.message },
        }),
      },
      times: params.times ?? { remainingTimes: 1 },
    })
  }
}

// Re-export for callers that want the label fake alongside the client.
export { gmail }
