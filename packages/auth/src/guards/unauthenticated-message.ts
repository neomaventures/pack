import type { ExecutionContext } from "@nestjs/common"

/**
 * Builds the resource-aware unauthenticated message used by the
 * authentication guards.
 *
 * The format is `Unauthenticated, access to resource <request-url> denied`,
 * where `<request-url>` is read from the request (Express `originalUrl`,
 * falling back to `url`). Sharing the helper keeps `AuthenticatedGuard` and
 * `RequiresPermissionGuard` aligned so consumers see the same message
 * regardless of which guard rejects the request.
 *
 * @param context - Execution context providing access to the HTTP request.
 * @returns The resource-aware unauthenticated message.
 *
 * @example
 * ```typescript
 * throw new UnauthorizedException(buildUnauthenticatedMessage(context))
 * ```
 */
export const buildUnauthenticatedMessage = (
  context: ExecutionContext,
): string => {
  const request = context.switchToHttp().getRequest<{
    originalUrl?: string
    url?: string
  }>()
  const url = request?.originalUrl ?? request?.url ?? ""
  return `Unauthenticated, access to resource ${url} denied`
}
