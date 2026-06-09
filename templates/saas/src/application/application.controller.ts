import { ErrorTemplate } from "@neomaventures/exceptions"
import { ApplicationLoggerService } from "@neomaventures/logging"
import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  Render,
} from "@nestjs/common"

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
   * Returns a health check response for liveness probes.
   *
   * Keyed by probe type so additional checks (e.g. `database`) can be
   * added without a breaking change.
   */
  @Get("api/health")
  public health(): { http: string } {
    return { http: "ok" }
  }

  /**
   * Exercises both modes of the exception filter via `@ErrorTemplate`.
   *
   * - `GET /error?type=render` — throws a 500, rendered as EJS error page
   * - `GET /error?type=redirect` — throws a 400, redirected to `/`
   *
   * Demonstrates per-exception routing: different exception classes
   * map to different error handling strategies on the same route.
   *
   * @param type - The error type to trigger ("render" or "redirect").
   */
  @Get("error")
  @ErrorTemplate({
    BadRequestException: "/",
    default: "errors/generic",
  })
  public error(@Query("type") type?: string): void {
    if (type === "redirect") {
      throw new BadRequestException("Invalid input")
    }
    if (type === "render") {
      throw new InternalServerErrorException("Something went wrong")
    }
    throw new BadRequestException(`Unknown error type: ${type}`)
  }
}
