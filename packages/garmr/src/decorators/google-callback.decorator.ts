import { applyDecorators, UseInterceptors } from "@nestjs/common"

import { GoogleCallbackInterceptor } from "../interceptors/google-callback.interceptor"

/**
 * Method decorator that applies the {@link GoogleCallbackInterceptor}.
 *
 * Extracts the `code` query parameter from the request, exchanges it with
 * Google's token endpoint, and attaches the result to `req.googleAuthResult`.
 *
 * Use with the {@link GetGoogleAuthResult} parameter decorator to extract the result.
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
export function GoogleCallback(): MethodDecorator {
  return applyDecorators(UseInterceptors(GoogleCallbackInterceptor))
}
