import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a downstream auth API (e.g. an OAuth provider's token
 * endpoint) responds with a non-2xx status, or returns a 2xx body that
 * violates the provider contract (missing required fields/claims).
 *
 * Domain-generic: `endpoint` captures the templated path that failed and
 * `context` carries any per-call identifiers, typically including
 * `provider` (e.g. `"google"`) and `phase` (e.g. `"codeExchange"` or
 * `"idTokenDecode"`). `responseBody` preserves the raw upstream body for
 * diagnostics.
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
 *   401,
 *   "/oauth/token",
 *   "Auth API returned 401",
 *   { provider: "google", phase: "codeExchange", tokenEndpoint },
 *   { error: "invalid_grant" },
 * )
 * ```
 */
export class AuthApiException extends HttpException {
  public readonly statusCode: number

  /**
   * @param statusCode - The upstream HTTP status
   * @param endpoint - The auth API endpoint that was called (use a
   *   templated path like `/oauth/token`)
   * @param message - A human-readable error message
   * @param context - Per-call identifiers relevant to the failure
   *   (typically `{ provider, phase, ... }`)
   * @param responseBody - The raw upstream response body for diagnostics
   * @param cause - The original error, if this exception wraps one.
   *   Passed through to {@link Error}'s `cause` so native stack chains work.
   */
  public constructor(
    statusCode: number,
    public readonly endpoint: string,
    message: string,
    public readonly context: Record<string, unknown>,
    public readonly responseBody: unknown,
    cause?: Error,
  ) {
    const mappedStatus = AuthApiException.mapStatus(statusCode)
    super(
      {
        statusCode: mappedStatus,
        message,
        error: "AuthApi",
      },
      mappedStatus,
      { cause },
    )
    this.name = "AuthApiException"
    this.statusCode = mappedStatus
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
