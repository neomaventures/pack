import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  Render,
} from "@nestjs/common"

import { ErrorTemplate } from "@neomaventures/exceptions"
import { ApplicationLoggerService } from "@neomaventures/logging"

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
   * Exercises the exception filter's redirect mode.
   *
   * When `@ErrorTemplate` resolves to a path starting with `/`, the
   * filter issues a 303 redirect instead of rendering a template.
   */
  @Get("redirect-error")
  @ErrorTemplate({ default: "/" })
  public redirectError(): void {
    throw new InternalServerErrorException("Redirecting back home")
  }

  /**
   * Renders the generic error page.
   */
  @Get("error")
  @Render("errors/generic")
  public error(): void {}
}
