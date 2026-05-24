import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a Google OAuth ID token contains an email that has not been verified.
 *
 * Returns HTTP 403 Forbidden because the user is identified but not authorized
 * to proceed without a verified email.
 *
 * @example
 * ```typescript
 * if (decoded.email_verified === false) {
 *   throw new EmailNotVerifiedException(decoded.email)
 * }
 * ```
 */
export class EmailNotVerifiedException extends HttpException {
  public readonly email: string

  /**
   * @param email - The unverified email address from the ID token
   */
  public constructor(email: string) {
    const message = `The email address ${email} has not been verified.`
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        email,
        error: "Forbidden",
      },
      HttpStatus.FORBIDDEN,
    )
    this.email = email
  }
}
