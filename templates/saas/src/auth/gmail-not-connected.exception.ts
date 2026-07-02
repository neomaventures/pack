import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown by {@link GmailTokenAccessor} when the request's account has no
 * active Google OAuth token covering the `gmail.readonly` scope.
 *
 * Used as a control-flow signal that escapes the mailbox-stats interceptor
 * and lands on the route-level `@ErrorTemplate` mapping so the profile page
 * renders the "not connected" variant. Returns HTTP 200 OK because, for
 * `GET /profile`, the user not being connected to Gmail is not an error
 * condition for the route itself — only for the interceptor.
 *
 * The wire response is the minimal `{ statusCode, message, error }` shape;
 * `error: "GmailNotConnected"` is the discriminator EJS templates branch on
 * when rendering the mailbox section.
 *
 * @example
 * ```typescript
 * throw new GmailNotConnectedException()
 * ```
 */
export class GmailNotConnectedException extends HttpException {
  public constructor() {
    super(
      {
        statusCode: HttpStatus.OK,
        message: "Gmail is not connected.",
        error: "GmailNotConnected",
      },
      HttpStatus.OK,
    )
  }
}
