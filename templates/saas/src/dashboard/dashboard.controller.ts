import { Controller, Get, Render } from "@nestjs/common"

/**
 * Handles the dashboard page.
 *
 * Renders `views/dashboard.ejs` for authenticated users.
 * Authentication guard will be added in a future slice (#155).
 */
@Controller()
export class DashboardController {
  /**
   * Renders the dashboard page.
   *
   * @returns An empty object — the template reads `npmPackageName`
   * and `npmPackageVersion` from `res.locals`.
   */
  @Get("dashboard")
  @Render("dashboard")
  public index(): void {
    // Template variables provided via res.locals by ViewLocalsMiddleware
  }
}
