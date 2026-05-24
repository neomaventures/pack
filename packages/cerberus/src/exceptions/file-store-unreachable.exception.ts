import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when the S3-compatible file store is unreachable or returns an SDK error.
 *
 * Returns HTTP 503 Service Unavailable. The endpoint, bucket, and underlying
 * cause are available as metadata for server-side diagnostics.
 *
 * @example
 * ```typescript
 * try {
 *   await storageService.store(name, body, contentType)
 * } catch (error) {
 *   throw new FileStoreUnreachableException(
 *     endpoint,
 *     bucket,
 *     error.message,
 *   )
 * }
 * ```
 */
export class FileStoreUnreachableException extends HttpException {
  /**
   * @param endpoint - The S3-compatible endpoint that was unreachable
   * @param bucket - The target bucket name
   * @param cause - The underlying error message from the SDK
   */
  public constructor(
    public readonly endpoint: string,
    public readonly bucket: string,
    public readonly cause: string,
  ) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: `Unable to reach file store at ${endpoint} (bucket: ${bucket}).`,
        endpoint,
        bucket,
        cause,
        error: "Service Unavailable",
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    )
  }
}
