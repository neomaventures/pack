import { Controller, Get, Render } from "@nestjs/common"

/**
 * Handles top-level routes for the SaaS template application.
 */
@Controller()
export class ApplicationController {
  /**
   * Renders the welcome page.
   */
  @Get()
  @Render("welcome")
  public index(): void {}

  /**
   * Renders the generic error page.
   */
  @Get("error")
  @Render("errors/generic")
  public error(): void {}
}
