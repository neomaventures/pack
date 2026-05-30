import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when the Google ID token is missing or has invalid claims.
 *
 * Returns HTTP 401 Unauthorized.
 *
 * @example
 * ```typescript
 * if (!decoded?.email) {
 *   throw new GoogleTokenException('missing email in ID token')
 * }
 * ```
 */
export class GoogleTokenException extends HttpException {
  public readonly reason: string

  /**
   * @param reason - Description of the ID token error
   */
  public constructor(reason: string) {
    const message = `Google ID token error: ${reason}`
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        reason,
        error: "Unauthorized",
      },
      HttpStatus.UNAUTHORIZED,
    )
    this.reason = reason
  }
}
