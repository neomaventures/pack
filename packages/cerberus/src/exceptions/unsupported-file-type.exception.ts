import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when an uploaded file's MIME type is not in the allowed types.
 *
 * Returns HTTP 415 Unsupported Media Type. The rejected MIME type and the list
 * of allowed types are available as metadata for client-facing error messages.
 *
 * @example
 * ```typescript
 * if (!allowedTypes.includes(file.mimetype)) {
 *   throw new UnsupportedFileTypeException(file.mimetype, allowedTypes)
 * }
 * ```
 */
export class UnsupportedFileTypeException extends HttpException {
  /**
   * @param mimeType - The MIME type of the uploaded file
   * @param allowedTypes - The list of MIME types that are accepted
   */
  public constructor(
    public readonly mimeType: string,
    public readonly allowedTypes: string[],
  ) {
    super(
      {
        statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        message: `File type "${mimeType}" is not supported. Allowed types: ${allowedTypes.join(", ")}.`,
        mimeType,
        allowedTypes,
        error: "Unsupported Media Type",
      },
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    )
  }
}
