import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when an uploaded file exceeds the configured maximum size.
 *
 * Returns HTTP 413 Payload Too Large. `fileSize` is `null` when the file
 * was rejected by multer before buffering (actual size unknown), or a
 * number when the interceptor caught the violation after buffering.
 *
 * @example
 * ```typescript
 * // Interceptor (file already buffered — size known)
 * throw new FileTooLargeException(file.size, maxSize)
 *
 * // Middleware (multer rejected before buffering — size unknown)
 * throw new FileTooLargeException(null, maxSize)
 * ```
 */
export class FileTooLargeException extends HttpException {
  /**
   * @param fileSize - The size of the uploaded file in bytes, or null if unknown
   * @param maxSize - The maximum allowed file size in bytes
   */
  public constructor(
    public readonly fileSize: number | null,
    public readonly maxSize: number,
  ) {
    const sizeInfo =
      fileSize !== null ? `File size ${fileSize} bytes exceeds` : "File exceeds"

    super(
      {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: `${sizeInfo} the maximum allowed size of ${maxSize} bytes.`,
        fileSize,
        maxSize,
        error: "Payload Too Large",
      },
      HttpStatus.PAYLOAD_TOO_LARGE,
    )
  }
}
