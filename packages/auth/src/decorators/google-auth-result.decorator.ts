import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { type Authenticatable } from "../interfaces/authenticatable.interface"
import { type GoogleAuthResult } from "../services/google-auth.service"

/**
 * Parameter decorator that extracts the Google OAuth authentication result
 * from the request object.
 *
 * Must be used on routes decorated with {@link GoogleCallback}, which
 * attaches `googleAuthResult` to the request via the
 * {@link GoogleCallbackInterceptor}.
 *
 * @throws {Error} If `req.googleAuthResult` is missing, indicating
 *   `@GoogleCallback()` was not applied to the route
 *
 * @example
 * ```typescript
 * @Get('callback')
 * @GoogleCallback()
 * public handleCallback(
 *   @GetGoogleAuthResult() result: GoogleAuthResult<User>,
 * ): void {
 *   // result.entity, result.isNewUser, result.profile
 * }
 * ```
 */
export const GetGoogleAuthResult = createParamDecorator(
  (
    _data: any,
    context: ExecutionContext,
  ): GoogleAuthResult<Authenticatable> => {
    const req = context.switchToHttp().getRequest()
    if (!req.googleAuthResult) {
      throw new Error(
        "GetGoogleAuthResult decorator called without googleAuthResult on the request. Did you apply @GoogleCallback() to this route?",
      )
    }
    return req.googleAuthResult
  },
)
