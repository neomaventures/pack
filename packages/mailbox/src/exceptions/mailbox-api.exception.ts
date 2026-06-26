import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when the Gmail API responds with a non-2xx status.
 *
 * Domain-generic: `endpoint` captures the Gmail path that failed and
 * `context` carries any per-endpoint identifiers (e.g. `{ labelId }` for
 * label lookups, `{ messageId }` for message fetches). The `cause` is a
 * constructed {@link HttpException} whose `getStatus()` reports the
 * upstream Gmail status and whose response carries the raw upstream
 * body for diagnostics.
 *
 * The HTTP status returned to the caller mirrors the upstream Gmail
 * status for the cases the package cares about (`401`, `404`) and
 * collapses everything else into `502 Bad Gateway` — upstream 5xx and
 * unexpected statuses are surfaced as a gateway failure, not leaked
 * verbatim.
 *
 * @example
 * ```typescript
 * throw new MailboxApiException(
 *   "/gmail/v1/users/me/labels/{labelId}",
 *   { labelId: "Label_42" },
 *   new HttpException(
 *     { statusCode: 404, message: "Mailbox API returned 404", body: errorBody },
 *     404,
 *   ),
 * )
 * ```
 */
export class MailboxApiException extends HttpException {
  /**
   * @param endpoint - The Gmail API endpoint that was called (use a
   *   templated path like `/gmail/v1/users/me/labels/{labelId}`)
   * @param context - Per-endpoint identifiers relevant to the failure
   *   (e.g. `{ labelId }`)
   * @param cause - The upstream failure as an {@link HttpException}. Its
   *   `getStatus()` provides the upstream Gmail status and its
   *   `getResponse()` carries the raw upstream body for diagnostics.
   *   Passed through to {@link Error}'s `cause` so native stack chains work.
   */
  public constructor(
    public readonly endpoint: string,
    public readonly context: Record<string, unknown>,
    cause: HttpException,
  ) {
    const mappedStatus = MailboxApiException.mapStatus(cause.getStatus())
    super(
      {
        statusCode: mappedStatus,
        message: cause.message,
        error: "MailboxApi",
      },
      mappedStatus,
      { cause },
    )
  }

  private static mapStatus(upstreamStatus: number): number {
    if (upstreamStatus === HttpStatus.UNAUTHORIZED) {
      return HttpStatus.UNAUTHORIZED
    }
    if (upstreamStatus === HttpStatus.NOT_FOUND) {
      return HttpStatus.NOT_FOUND
    }
    return HttpStatus.BAD_GATEWAY
  }
}
