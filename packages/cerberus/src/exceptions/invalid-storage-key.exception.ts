import { HttpException, HttpStatus } from "@nestjs/common"

/** S3 hard limit for object key length (UTF-8 encoded). */
export const MAX_KEY_BYTES = 1024

/**
 * Thrown when a key produced by a key resolver is rejected by the storage
 * engine before reaching S3.
 *
 * Catches programmer/library bugs early — empty keys and keys exceeding the
 * S3 hard limit of 1024 bytes (UTF-8 encoded). Returns HTTP 500 because end
 * users do not produce these directly; they indicate a bug in a
 * {@link CerberusKeyResolver} or in the framework's default resolver.
 *
 * The offending key is intentionally excluded from the HTTP response body
 * to avoid leaking potentially large or sensitive resolver output.
 *
 * @example
 * ```typescript
 * if (!key) throw new InvalidStorageKeyException(key, "empty")
 * if (Buffer.byteLength(key, "utf8") > 1024) {
 *   throw new InvalidStorageKeyException(key, "too-long")
 * }
 * ```
 */
export class InvalidStorageKeyException extends HttpException {
  /**
   * @param key - The offending storage key (available on the instance for logging, not in the response)
   * @param reason - The category of invalidity (`empty` or `too-long`)
   */
  public constructor(
    public readonly key: string,
    public readonly reason: "empty" | "too-long",
  ) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: InvalidStorageKeyException.composeMessage(key, reason),
        reason,
        error: "Internal Server Error",
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }

  private static composeMessage(
    key: string,
    reason: "empty" | "too-long",
  ): string {
    if (reason === "empty") {
      return "Storage key cannot be empty."
    }
    return `Storage key exceeds ${MAX_KEY_BYTES} bytes (got ${Buffer.byteLength(
      key,
      "utf8",
    )} bytes).`
  }
}
