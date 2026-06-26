import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a downstream auth API (e.g. an OAuth provider's token
 * endpoint) responds with a non-2xx status, or returns a 2xx body that
 * violates the provider contract (missing required fields/claims).
 *
 * Domain-generic: `endpoint` captures the templated path that failed and
 * `context` carries any per-call identifiers, typically including
 * `provider` (e.g. `"google"`) and `phase` (e.g. `"codeExchange"` or
 * `"idTokenDecode"`). The wrapped `cause` (an `HttpException`) carries
 * the upstream status, message, and response body for diagnostics.
 *
 * Symmetric with {@link AuthNetworkException}: `(endpoint, context, cause)`.
 *
 * The HTTP status returned to the caller mirrors the upstream status for
 * the cases the package cares about (`401`, `404`) and collapses
 * everything else into `502 Bad Gateway` — upstream 5xx, unexpected
 * statuses, and the malformed-2xx case are surfaced as a gateway
 * failure, not leaked verbatim.
 *
 * @example
 * ```typescript
 * throw new AuthApiException(
 *   "/oauth/token",
 *   { provider: "google", phase: "codeExchange", tokenEndpoint },
 *   new HttpException(
 *     { statusCode: 401, message: "Auth API returned 401", body: errorBody },
 *     401,
 *   ),
 * )
 * ```
 */
export class AuthApiException extends HttpException {
  /**
   * @param endpoint - The auth API endpoint that was called (use a
   *   templated path like `/oauth/token`)
   * @param context - Per-call identifiers relevant to the failure
   *   (typically `{ provider, phase, ... }`)
   * @param cause - An `HttpException` (or subclass) carrying the
   *   upstream status (via `getStatus()`), human-readable message, and
   *   raw response body. Passed through to {@link Error}'s `cause` so
   *   native stack chains work; access via `err.cause` for diagnostics.
   */
  public constructor(
    public readonly endpoint: string,
    public readonly context: Record<string, unknown>,
    cause: HttpException,
  ) {
    const upstreamStatus = cause.getStatus()
    const mappedStatus = AuthApiException.mapStatus(upstreamStatus)
    super(
      {
        statusCode: mappedStatus,
        message: cause.message,
        error: "AuthApi",
      },
      mappedStatus,
      { cause },
    )
  }

  private static mapStatus(upstreamStatus: number): number {
    if (upstreamStatus === HttpStatus.UNAUTHORIZED) {
      return HttpStatus.UNAUTHORIZED
    }
    if (upstreamStatus === HttpStatus.NOT_FOUND) {
      return HttpStatus.NOT_FOUND
    }
    return HttpStatus.BAD_GATEWAY
  }
}
