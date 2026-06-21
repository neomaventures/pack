import { HttpException, HttpStatus } from "@nestjs/common"

// NOTE: not yet exported from `index.ts`. `GmailService` is internal in
// v0.1.0, so this exception is only thrown across an internal boundary.
// It becomes part of the public API when `MailboxService` lands and
// wraps `GmailService` — at that point add the barrel export.

/**
 * Thrown when the Gmail API responds with a non-2xx status.
 *
 * The HTTP status returned to the caller mirrors the upstream Gmail
 * status for the cases the package cares about (`401`, `404`) and
 * collapses everything else into `502 Bad Gateway` — upstream 5xx and
 * unexpected statuses are surfaced as a gateway failure, not leaked
 * verbatim.
 *
 * @example
 * ```typescript
 * throw new GmailApiException(404, "Label_42", "Not Found")
 * ```
 */
export class GmailApiException extends HttpException {
  public readonly labelId: string

  /**
   * @param statusCode - The upstream Gmail HTTP status
   * @param labelId - The label ID that was being fetched when the error occurred
   * @param message - A human-readable error message (typically the upstream status text)
   */
  public constructor(statusCode: number, labelId: string, message: string) {
    const mappedStatus = GmailApiException.mapStatus(statusCode)
    super(
      {
        statusCode: mappedStatus,
        message,
        labelId,
        error: "GmailApi",
      },
      mappedStatus,
    )
    this.labelId = labelId
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
