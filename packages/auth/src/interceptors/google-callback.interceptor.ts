import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common"
import { Observable } from "rxjs"

import { GoogleAuthService } from "../services/google-auth.service"

/**
 * Interceptor that extracts a Google OAuth authorization code from the
 * `code` query parameter, exchanges it via {@link GoogleAuthService},
 * and attaches the result to `req.googleAuthResult`.
 *
 * Use the {@link GoogleCallback} decorator to apply this interceptor
 * to a controller method.
 *
 * @throws {BadRequestException} If the `code` query parameter is missing
 *   from the callback request — the upstream provider redirected back
 *   without it, or the route is mis-wired by the consumer.
 *
 * @example
 * ```typescript
 * @Get('callback')
 * @GoogleCallback()
 * public handleCallback(@GetGoogleAuthResult() result: GoogleAuthResult<User>): void {
 *   // result.account, result.isNewAccount, result.profile
 * }
 * ```
 */
@Injectable()
export class GoogleCallbackInterceptor implements NestInterceptor {
  public constructor(private readonly googleAuthService: GoogleAuthService) {}

  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()
    const code = req.query?.code as string | undefined

    if (!code) {
      throw new BadRequestException(
        "Missing code query parameter on Google OAuth callback",
      )
    }

    req.googleAuthResult = await this.googleAuthService.authenticate(code)

    return next.handle()
  }
}
