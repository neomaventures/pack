import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a network-level failure occurs talking to the Gmail API
 * (e.g. `fetch()` rejects because the connection is dropped, DNS fails,
 * or the upstream is otherwise unreachable).
 *
 * Distinct from {@link GmailApiException}, which represents an HTTP
 * response from Gmail (a non-2xx status). This is for the case where no
 * response was received at all.
 *
 * Returns HTTP 503 Service Unavailable — downstream is unreachable.
 *
 * @example
 * ```typescript
 * try {
 *   await fetch(url, { ... })
 * } catch (error) {
 *   throw new GmailNetworkException(
 *     "/gmail/v1/users/me/labels/{labelId}",
 *     { labelId },
 *     error as Error,
 *   )
 * }
 * ```
 */
export class GmailNetworkException extends HttpException {
  public readonly endpoint: string
  public readonly context: Record<string, unknown>

  /**
   * @param endpoint - The Gmail API endpoint that was called (use a
   *   templated path like `/gmail/v1/users/me/labels/{labelId}`)
   * @param context - Per-endpoint identifiers relevant to the failure
   *   (e.g. `{ labelId }`)
   * @param cause - The original network error. Passed through to
   *   {@link Error}'s `cause` so native stack chains work.
   */
  public constructor(
    endpoint: string,
    context: Record<string, unknown>,
    cause: Error,
  ) {
    const message = `Gmail network error: ${cause.message}`
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message,
        endpoint,
        context,
        error: "GmailNetwork",
      },
      HttpStatus.SERVICE_UNAVAILABLE,
      { cause },
    )
    this.endpoint = endpoint
    this.context = context
  }
}
