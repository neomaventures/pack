import { HttpException, HttpStatus } from "@nestjs/common"

// NOTE: not yet exported from `index.ts`. `GmailService` is internal in
// v0.1.0, so this exception is only thrown across an internal boundary.
// It becomes part of the public API when `MailboxService` lands and
// wraps `GmailService` — at that point add the barrel export.

/**
 * Thrown when the Gmail API responds with a non-2xx status.
 *
 * Domain-generic: `endpoint` captures the Gmail path that failed and
 * `context` carries any per-endpoint identifiers (e.g. `{ labelId }` for
 * label lookups, `{ messageId }` for message fetches). `responseBody`
 * preserves the raw upstream body for diagnostics.
 *
 * The HTTP status returned to the caller mirrors the upstream Gmail
 * status for the cases the package cares about (`401`, `404`) and
 * collapses everything else into `502 Bad Gateway` — upstream 5xx and
 * unexpected statuses are surfaced as a gateway failure, not leaked
 * verbatim.
 *
 * @example
 * ```typescript
 * throw new GmailApiException(
 *   404,
 *   "/gmail/v1/users/me/labels/{labelId}",
 *   "Gmail API 404",
 *   { labelId: "Label_42" },
 *   { error: { code: 404, message: "Not Found" } },
 * )
 * ```
 */
export class GmailApiException extends HttpException {
  public readonly statusCode: number

  /**
   * @param statusCode - The upstream Gmail HTTP status
   * @param endpoint - The Gmail API endpoint that was called (use a
   *   templated path like `/gmail/v1/users/me/labels/{labelId}`)
   * @param message - A human-readable error message (typically the
   *   upstream status text)
   * @param context - Per-endpoint identifiers relevant to the failure
   *   (e.g. `{ labelId }`)
   * @param responseBody - The raw upstream response body for diagnostics
   * @param cause - The original error, if this exception wraps one.
   *   Passed through to {@link Error}'s `cause` so native stack chains work.
   */
  public constructor(
    statusCode: number,
    public readonly endpoint: string,
    message: string,
    public readonly context: Record<string, unknown>,
    public readonly responseBody: unknown,
    cause?: Error,
  ) {
    const mappedStatus = GmailApiException.mapStatus(statusCode)
    super(
      {
        statusCode: mappedStatus,
        message,
        error: "MailboxApi",
      },
      mappedStatus,
      { cause },
    )
    this.statusCode = mappedStatus
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
