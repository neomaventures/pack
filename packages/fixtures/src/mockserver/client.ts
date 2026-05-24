import { type MockserverExpectation, type MockserverHttpRequest } from "./types"

/**
 * HTTP client for interacting with a MockServer instance.
 *
 * Provides methods to reset expectations, register new expectations,
 * and verify that expected requests were received.
 *
 * @example
 * ```typescript
 * const client = new MockServerClient("http://localhost:1080/mockserver")
 * await client.reset()
 * await client.createExpectation({
 *   httpRequest: { path: "/api/users", method: "GET" },
 *   httpResponse: { statusCode: 200, body: "[]" },
 *   times: { unlimited: true },
 * })
 * const matched = await client.verifyExpectationMatched(
 *   { path: "/api/users", method: "GET" },
 * )
 * ```
 */
export class MockServerClient {
  /**
   * @param baseUrl - The base URL of the MockServer instance
   *   (e.g. `http://localhost:1080/mockserver`)
   */
  public constructor(private readonly baseUrl: string) {}

  /**
   * Resets all expectations on the MockServer instance.
   *
   * @throws {Error} When the MockServer returns a non-2xx response
   *
   * @example
   * ```typescript
   * await client.reset()
   * ```
   */
  public async reset(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/reset`, { method: "PUT" })

    if (!response.ok) {
      throw new Error(
        `Error resetting mock server ${this.baseUrl}: ${response.status}`,
      )
    }
  }

  /**
   * Registers an expectation (a request to match and a response to return)
   * on the MockServer instance.
   *
   * @param expectation - The expectation to register
   *
   * @throws {Error} When the MockServer returns a non-2xx response
   *
   * @example
   * ```typescript
   * await client.createExpectation({
   *   httpRequest: { path: "/api/users", method: "GET" },
   *   httpResponse: { statusCode: 200, body: "[]" },
   *   times: { unlimited: true },
   * })
   * ```
   */
  public async createExpectation(
    expectation: MockserverExpectation,
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/expectation`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(expectation),
    })

    if (!response.ok) {
      throw new Error(
        `Error creating expectation on ${this.baseUrl}: ${response.status} ${await response.text()}`,
      )
    }
  }

  /**
   * Verifies that a specific request was made a certain number of times
   * against the MockServer instance.
   *
   * @param httpRequest - The request pattern to verify
   * @param count - The exact number of times the request should have been
   *   made. Defaults to `1`.
   *
   * @returns `true` if the request was matched exactly `count` times,
   *   otherwise `false`
   *
   * @example
   * ```typescript
   * const matched = await client.verifyExpectationMatched(
   *   { path: "/api/users", method: "GET" },
   * )
   * ```
   */
  public async verifyExpectationMatched(
    httpRequest: MockserverHttpRequest,
    count: number = 1,
  ): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/verify`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        httpRequest,
        times: {
          atLeast: count,
          atMost: count,
        },
      }),
    })

    if (response.ok) {
      return true
    }

    if (response.status === 406) {
      return false
    }

    throw new Error(
      `Error verifying expectation on ${this.baseUrl}: ${response.status} ${await response.text()}`,
    )
  }
}
