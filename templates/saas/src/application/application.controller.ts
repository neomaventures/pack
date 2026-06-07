import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  Render,
} from "@nestjs/common"

import { ErrorTemplate } from "@neomaventures/exceptions"
import { ApplicationLoggerService } from "@neomaventures/logging"

import { RedirectErrorException } from "~application/redirect-error.exception"

/**
 * Handles top-level routes for the SaaS template application.
 */
@Controller()
export class ApplicationController {
  public constructor(private readonly logger: ApplicationLoggerService) {}

  /**
   * Renders the welcome page.
   *
   * When the `error` query parameter is set to `"true"`, throws an
   * {@link InternalServerErrorException} to exercise the exception
   * filter's render mode via {@link ErrorTemplate}.
   *
   * @param error - Optional query parameter to trigger an error.
   */
  @Get()
  @Render("welcome")
  @ErrorTemplate({ default: "errors/generic" })
  public index(@Query("error") error?: string): void {
    if (error === "true") {
      throw new InternalServerErrorException("Something went wrong")
    }
    this.logger.log("Welcome page requested")
  }

  /**
   * Throws a {@link RedirectErrorException} to exercise the exception
   * filter's redirect mode. The filter catches the exception and issues
   * a 303 redirect to the URL returned by `getRedirect()`.
   */
  @Get("redirect-error")
  public redirectError(): void {
    throw new RedirectErrorException()
  }

  /**
   * Renders the generic error page.
   */
  @Get("error")
  @Render("errors/generic")
  public error(): void {}
}
