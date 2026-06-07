import { HttpStatus } from "@nestjs/common"

import { type NeomaException } from "@neomaventures/exceptions"

/**
 * Exception that exercises the redirect mode of the Neoma exception filter.
 *
 * When thrown, the filter redirects the client to the welcome page
 * with a 303 See Other status instead of rendering an error template.
 */
export class RedirectErrorException extends Error implements NeomaException {
  public constructor() {
    super("Redirect error demonstration")
    this.name = "RedirectErrorException"
  }

  /**
   * Returns a 303 redirect to the welcome page.
   *
   * @returns The redirect instruction for the exception filter.
   */
  public getRedirect(): { status: number; url: string } {
    return { status: HttpStatus.SEE_OTHER, url: "/" }
  }

  /**
   * Returns the HTTP status code for this exception.
   *
   * @returns 500 Internal Server Error.
   */
  public getStatus(): number {
    return HttpStatus.INTERNAL_SERVER_ERROR
  }

  /**
   * Returns the JSON response body.
   *
   * @returns The error response object.
   */
  public getResponse(): object {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.message,
      error: "Internal Server Error",
    }
  }

  /**
   * Suppresses logging for this demonstration exception.
   */
  public log(): void {}
}
