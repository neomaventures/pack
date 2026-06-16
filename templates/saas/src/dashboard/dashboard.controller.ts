import {
  type Account,
  Authenticated,
  AuthenticatedAccount,
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
   * @param account - The authenticated user, injected via the `@AuthenticatedAccount()` decorator.
   *
   * @returns The user's email address for display in the template.
   */
  @Get("dashboard")
  @Authenticated()
  @Render("dashboard")
  public index(@AuthenticatedAccount() account: Account): { email: string } {
    return { email: account.email }
  }
}
