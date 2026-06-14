import { UnauthorizedRedirectException } from "@neomaventures/auth"
import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common"
import { type Response } from "express"

/**
 * Test-side exception filter that turns {@link UnauthorizedRedirectException}
 * into an actual HTTP redirect, mirroring what a consumer would install when
 * using the `onUnauthenticated: "/login"` strategy with a server-rendered app.
 *
 * Lives in the e2e app (not the published package) — the package ships the
 * exception with `getRedirect()`; consumers wire the filter.
 */
@Catch(UnauthorizedRedirectException)
export class UnauthorizedRedirectFilter implements ExceptionFilter {
  public catch(
    exception: UnauthorizedRedirectException,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>()
    const { url, status } = exception.getRedirect()
    response.redirect(status, url)
  }
}
