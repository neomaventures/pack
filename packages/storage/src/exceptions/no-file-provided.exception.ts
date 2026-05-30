import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown when a multipart request does not include a file field.
 *
 * Returns HTTP 400 Bad Request.
 *
 * @example
 * ```typescript
 * if (!file) {
 *   throw new NoFileProvidedException()
 * }
 * ```
 */
export class NoFileProvidedException extends HttpException {
  public constructor() {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "No file was provided in the request.",
        error: "Bad Request",
      },
      HttpStatus.BAD_REQUEST,
    )
  }
}
