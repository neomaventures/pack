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
 * Thrown when a network-level failure occurs talking to the Gmail API
 * (e.g. `fetch()` rejects because the connection is dropped, DNS fails,
 * or the upstream is otherwise unreachable).
 *
 * Distinct from {@link GmailApiException}, which represents an HTTP
 * response from Gmail (a non-2xx status). This is for the case where no
 * response was received at all.
 *
 * Returns HTTP 502 Bad Gateway — downstream is unreachable.
 *
 * @example
 * ```typescript
 * try {
 *   await fetch(url, { ... })
 * } catch (error) {
 *   throw new GmailNetworkException(
 *     "/gmail/v1/users/me/labels/{labelId}",
 *     { labelId },
 *     error as Error,
 *   )
 * }
 * ```
 */
export class GmailNetworkException extends HttpException {
  public readonly code: string

  /**
   * @param endpoint - The Gmail API endpoint that was called (use a
   *   templated path like `/gmail/v1/users/me/labels/{labelId}`)
   * @param context - Per-endpoint identifiers relevant to the failure
   *   (e.g. `{ labelId }`)
   * @param cause - The original network error. Passed through to
   *   {@link Error}'s `cause` so native stack chains work.
   */
  public constructor(
    public readonly endpoint: string,
    public readonly context: Record<string, unknown>,
    cause: Error,
  ) {
    const message = "Mailbox network error"
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message,
        error: "MailboxNetwork",
      },
      HttpStatus.BAD_GATEWAY,
      { cause },
    )
    this.name = "GmailNetworkException"
    this.code = GmailNetworkException.extractCode(cause)
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
