import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when Google OAuth code exchange fails.
 *
 * Returns HTTP 401 Unauthorized.
 *
 * @example
 * ```typescript
 * if (!tokenResponse.ok) {
 *   throw new GoogleCodeExchangeException('token endpoint returned 400')
 * }
 * ```
 */
export class GoogleCodeExchangeException extends HttpException {
  public readonly reason: string

  /**
   * @param reason - Description of why the code exchange failed
   */
  public constructor(reason: string) {
    const message = `Google authentication failed: ${reason}`
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
