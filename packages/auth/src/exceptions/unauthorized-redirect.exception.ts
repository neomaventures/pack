import { HttpStatus, UnauthorizedException } from "@nestjs/common"

/**
 * Thrown when an unauthenticated request should be redirected to a login page
 * rather than receiving a 401 JSON response.
 *
 * Extends {@link UnauthorizedException} so existing 401 catch filters still apply.
 * The `getRedirect()` method provides the redirect URL and status code
 * for an exception filter to choose to handle as an HTTP redirect.
 *
 * The response body is self-describing — it includes a `redirect` field with
 * the intended target so consumers without a redirect-aware exception filter
 * can still observe where the user should go (e.g. `{ statusCode, message,
 * redirect: { url, status } }`). For an actual HTTP redirect, wire a filter
 * (or use `@neomaventures/exceptions`) that calls `getRedirect()`.
 *
 * An optional contextual `message` may be supplied (typically the
 * resource-aware string built by `AuthenticatedGuard`) and is appended with
 * `". Redirecting to login."` so the body carries both the denied resource
 * and the redirect intent.
 *
 * @example
 * ```typescript
 * throw new UnauthorizedRedirectException("/auth/magic-link", HttpStatus.SEE_OTHER)
 * ```
 */
export class UnauthorizedRedirectException extends UnauthorizedException {
  /**
   * @param url - The URL to redirect the unauthenticated user to
   * @param redirectStatus - The HTTP status code for the redirect (e.g. 303 See Other)
   * @param message - Optional contextual message describing the denied request.
   *   When provided, the response body's `message` becomes
   *   `"<message>. Redirecting to login."`; otherwise it defaults to
   *   `"Unauthorized. Redirecting to login."`.
   */
  public constructor(
    public readonly url: string,
    public readonly redirectStatus: number,
    message?: string,
  ) {
    const fullMessage = message
      ? `${message}. Redirecting to login.`
      : "Unauthorized. Redirecting to login."
    super({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: fullMessage,
      redirect: { url, status: redirectStatus },
    })
  }

  /**
   * Returns the redirect target for an exception filter to handle.
   *
   * @returns Object containing the redirect URL and HTTP status code
   */
  public getRedirect(): { url: string; status: number } {
    return { url: this.url, status: this.redirectStatus }
  }
}
