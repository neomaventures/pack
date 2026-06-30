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
 * Always returns HTTP 502 Bad Gateway, regardless of the upstream Gmail
 * status. Upstream-status leakage onto the wire is misleading (a 401
 * from Gmail is not the client's credentials to our API being bad) and
 * asymmetric with {@link MailboxNetworkException}, which is already
 * flat-502. Consumers that need to branch on the upstream status can
 * read `err.cause.getStatus()` from a filter or log handler.
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
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: cause.message,
        error: "MailboxApi",
      },
      HttpStatus.BAD_GATEWAY,
      { cause },
    )
  }
}
