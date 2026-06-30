import { STATUS_CODES } from "node:http"

import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a network-level failure occurs talking to the Gmail API
 * (e.g. `fetch()` rejects because the connection is dropped, DNS fails,
 * or the upstream is otherwise unreachable).
 *
 * Distinct from {@link MailboxApiException}, which represents an HTTP
 * response from Gmail (a non-2xx status). This is for the case where no
 * response was received at all.
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
 *   throw new MailboxNetworkException(
 *     "/gmail/v1/users/me/labels/{labelId}",
 *     { labelId },
 *     error as Error,
 *   )
 * }
 * ```
 */
export class MailboxNetworkException extends HttpException {
  /**
   * @param endpoint - The Gmail API endpoint that was called (use a
   *   templated path like `/gmail/v1/users/me/labels/{labelId}`)
   * @param context - Per-endpoint identifiers relevant to the failure
   *   (e.g. `{ labelId }`)
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
        error: "MailboxNetwork",
      },
      HttpStatus.BAD_GATEWAY,
      { cause },
    )
  }
}
