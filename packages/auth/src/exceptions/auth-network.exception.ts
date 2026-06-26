import { HttpException, HttpStatus } from "@nestjs/common"

const KNOWN_CODES = [
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
] as const

type KnownCode = (typeof KNOWN_CODES)[number] | "UNKNOWN"

/**
 * Thrown when a network-level failure occurs talking to a downstream
 * auth API (e.g. `fetch()` rejects because the connection is dropped,
 * DNS fails, or the upstream is otherwise unreachable).
 *
 * Distinct from {@link AuthApiException}, which represents an HTTP
 * response from the upstream (a non-2xx status, or a malformed 2xx). This
 * is for the case where no response was received at all.
 *
 * Returns HTTP 502 Bad Gateway — downstream is unreachable.
 *
 * @example
 * ```typescript
 * try {
 *   await fetch(url, { ... })
 * } catch (error) {
 *   throw new AuthNetworkException(
 *     "/oauth/token",
 *     { provider: "google", phase: "codeExchange" },
 *     error as Error,
 *   )
 * }
 * ```
 */
export class AuthNetworkException extends HttpException {
  public readonly code: string

  /**
   * @param endpoint - The auth API endpoint that was called (use a
   *   templated path like `/oauth/token`)
   * @param context - Per-call identifiers relevant to the failure
   *   (typically `{ provider, phase, ... }`)
   * @param cause - The original network error. Passed through to
   *   {@link Error}'s `cause` so native stack chains work.
   */
  public constructor(
    public readonly endpoint: string,
    public readonly context: Record<string, unknown>,
    cause: Error,
  ) {
    const message = "Auth network error"
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message,
        error: "AuthNetwork",
      },
      HttpStatus.BAD_GATEWAY,
      { cause },
    )
    this.code = AuthNetworkException.extractCode(cause)
  }

  private static extractCode(cause: Error): KnownCode {
    const nestedCode = (cause as { cause?: { code?: unknown } }).cause?.code
    if (typeof nestedCode === "string" && this.isKnown(nestedCode)) {
      return nestedCode
    }
    const directCode = (cause as { code?: unknown }).code
    if (typeof directCode === "string" && this.isKnown(directCode)) {
      return directCode
    }
    if (cause.name === "AbortError") {
      return "ETIMEDOUT"
    }
    return "UNKNOWN"
  }

  private static isKnown(code: string): code is (typeof KNOWN_CODES)[number] {
    return (KNOWN_CODES as readonly string[]).includes(code)
  }
}
