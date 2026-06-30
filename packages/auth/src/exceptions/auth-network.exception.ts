import { STATUS_CODES } from "node:http"

import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a network-level failure occurs talking to a downstream
 * auth API (e.g. `fetch()` rejects because the connection is dropped,
 * DNS fails, or the upstream is otherwise unreachable).
 *
 * Distinct from {@link AuthApiException}, which represents an HTTP
 * response from the upstream (a non-2xx status, or a malformed 2xx). This
 * is for the case where no response was received at all.
 *
 * Returns HTTP 502 Bad Gateway. The original error is passed through to
 * `err.cause`; consumers that need the underlying `code`, `message`, or
 * stack can read them from there (`undici` puts the real socket error at
 * `err.cause.cause`).
 *
 * @example
 * ```typescript
 * try {
 *   await fetch(url, { ... })
 * } catch (error) {
 *   throw new AuthNetworkException(
 *     "/oauth/token",
 *     { provider: "google", phase: "codeExchange" },
 *     error as Error,
 *   )
 * }
 * ```
 */
export class AuthNetworkException extends HttpException {
  /**
   * @param endpoint - The auth API endpoint that was called (use a
   *   templated path like `/oauth/token`)
   * @param context - Per-call identifiers relevant to the failure
   *   (typically `{ provider, phase, ... }`)
   * @param cause - The original network error. Passed through to
   *   {@link Error}'s `cause` so native stack chains work.
   */
  public constructor(
    public readonly endpoint: string,
    public readonly context: Record<string, unknown>,
    cause: Error,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: STATUS_CODES[HttpStatus.BAD_GATEWAY],
        error: "AuthNetwork",
      },
      HttpStatus.BAD_GATEWAY,
      { cause },
    )
  }
}
