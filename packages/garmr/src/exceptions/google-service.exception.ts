import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when Google's token endpoint returns a 5xx server error during
 * OAuth code exchange.
 *
 * Returns HTTP 502 Bad Gateway.
 *
 * @example
 * ```typescript
 * if (response.status >= 500) {
 *   throw new GoogleServiceException(description)
 * }
 * ```
 */
export class GoogleServiceException extends HttpException {
  public readonly reason: string

  /**
   * @param reason - Description of the Google service error
   */
  public constructor(reason: string) {
    const message = `Google service error: ${reason}`
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message,
        reason,
        error: "Bad Gateway",
      },
      HttpStatus.BAD_GATEWAY,
    )
    this.reason = reason
  }
}
