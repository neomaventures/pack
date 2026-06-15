import { ErrorTemplate } from "@neomaventures/exceptions"
import {
  HealthCheck,
  type HealthResult,
  HealthStatus,
} from "@neomaventures/healthcheck"
import { ApplicationLogger } from "@neomaventures/logging"
import {
  BadRequestException,
  Controller,
  Get,
  Header,
  InternalServerErrorException,
  Query,
  Render,
} from "@nestjs/common"

/**
 * Handles top-level routes for the SaaS template application.
 */
@Controller()
export class ApplicationController {
  public constructor(private readonly logger: ApplicationLogger) {}

  /**
   * Renders the welcome page.
   */
  @Get()
  @Render("welcome")
  public index(): void {
    this.logger.info("Welcome page requested")
  }

  /**
   * JSON healthcheck endpoint for liveness/readiness probes.
   *
   * The global `HealthcheckInterceptor` runs the probes, sets the HTTP
   * status (200/503), and attaches the result to the request;
   * `@HealthStatus()` extracts it. The method body just returns the
   * result for NestJS to serialise as JSON.
   */
  @Get("api/health")
  @HealthCheck()
  public apiHealth(@HealthStatus() status: HealthResult): HealthResult {
    return status
  }

  /**
   * Human-readable HTML status page (statuspage.io-style).
   *
   * Same `@HealthCheck()` flow as the JSON endpoint — the interceptor
   * runs the probes and sets HTTP 200 or 503; this method is a thin
   * pass-through into the EJS render context. `Cache-Control: no-store`
   * ensures every refresh re-probes.
   *
   * Unauthenticated by default — `ApplicationController` carries no
   * class-level guard, matching the policy of `/api/health`.
   */
  @Get("health")
  @HealthCheck()
  @Header("Cache-Control", "no-store")
  @Render("application/status")
  public health(@HealthStatus() status: HealthResult): {
    result: HealthResult
  } {
    // Wrap under `result` so the EJS template can distinguish probe
    // data (`result.*`) from the view-engine globals merged into
    // `locals` (`npmPackageName`, `npmPackageVersion`). Without the
    // wrap, those globals would surface as fake probe rows.
    return { result: status }
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
