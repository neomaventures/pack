import { Controller, Get, Render } from "@nestjs/common"

import { ApplicationLoggerService } from "@neomaventures/logging"

/**
 * Handles top-level routes for the SaaS template application.
 */
@Controller()
export class ApplicationController {
  public constructor(private readonly logger: ApplicationLoggerService) {}

  /**
   * Renders the welcome page.
   */
  @Get()
  @Render("welcome")
  public index(): void {
    this.logger.log("Welcome page requested")
  }

  /**
   * Renders the generic error page.
   */
  @Get("error")
  @Render("errors/generic")
  public error(): void {}
}
