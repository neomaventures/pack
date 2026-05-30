import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common"
import { Observable } from "rxjs"

import { GoogleCodeExchangeException } from "../exceptions/google-code-exchange.exception"
import { GoogleAuthService } from "../services/google-auth.service"

/**
 * Interceptor that extracts a Google OAuth authorization code from the
 * `code` query parameter, exchanges it via {@link GoogleAuthService},
 * and attaches the result to `req.googleAuthResult`.
 *
 * Use the {@link GoogleCallback} decorator to apply this interceptor
 * to a controller method.
 *
 * @throws {GoogleCodeExchangeException} If the `code` query parameter is missing
 *
 * @example
 * ```typescript
 * @Get('callback')
 * @GoogleCallback()
 * public handleCallback(@GetGoogleAuthResult() result: GoogleAuthResult<User>): void {
 *   // result.entity, result.isNewUser, result.profile
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
      throw new GoogleCodeExchangeException("missing code query parameter")
    }

    req.googleAuthResult = await this.googleAuthService.authenticate(code)

    return next.handle()
  }
}
