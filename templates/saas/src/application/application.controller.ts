import { Controller, Get } from "@nestjs/common"

/**
 * Handles top-level routes for the SaaS template application.
 */
@Controller()
export class ApplicationController {
  /**
   * Returns a simple greeting to confirm the app is running.
   *
   * @returns A welcome message string.
   */
  @Get()
  public index(): string {
    return "Hello World"
  }
}
