import { ErrorTemplate } from "@neomaventures/exceptions"
import { HealthCheck } from "@neomaventures/healthcheck"
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
   * Healthcheck endpoint for liveness/readiness probes.
   *
   * The method body is intentionally empty — the global
   * `HealthcheckInterceptor` from `@neomaventures/healthcheck` replaces the
   * response with the aggregated probe result and sets the HTTP status.
   */
  @Get("api/health")
  @HealthCheck()
  public health(): void {}

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
