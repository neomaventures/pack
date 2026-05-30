import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a network error occurs during Google OAuth code exchange.
 *
 * Returns HTTP 502 Bad Gateway.
 *
 * @example
 * ```typescript
 * try {
 *   await fetch(tokenEndpoint, { ... })
 * } catch (error) {
 *   throw new GoogleNetworkException(error.message)
 * }
 * ```
 */
export class GoogleNetworkException extends HttpException {
  public readonly reason: string

  /**
   * @param reason - Description of the network error
   */
  public constructor(reason: string) {
    const message = `Google authentication network error: ${reason}`
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
