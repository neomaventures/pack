import {
  type Authenticatable,
  Authenticated,
  Principal,
} from "@neomaventures/auth"
import { Controller, Get, Render } from "@nestjs/common"

/**
 * Handles the dashboard page.
 *
 * Renders `views/dashboard.ejs` for authenticated users.
 * Unauthenticated visitors are redirected to `/auth/register`.
 */
@Controller()
export class DashboardController {
  /**
   * Renders the dashboard page for the authenticated user.
   *
   * @param principal - The authenticated user, injected via the `@Principal()` decorator.
   *
   * @returns The user's email address for display in the template.
   */
  @Get("dashboard")
  @Authenticated()
  @Render("dashboard")
  public index(@Principal() principal: Authenticatable): { email: string } {
    return { email: principal.email }
  }
}
