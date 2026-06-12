import { Authenticated } from "@neomaventures/auth"
import { Controller, Get, Render, UseGuards } from "@nestjs/common"

/**
 * Handles the profile page.
 *
 * Renders `views/profile.ejs` for authenticated users.
 * Unauthenticated visitors are redirected to `/auth/register`.
 */
@Controller()
export class ProfileController {
  /**
   * Renders the profile page for the authenticated user.
   *
   * @returns An empty view model; the template currently has no
   *   dynamic data. Avatar rendering will be added in slice 1.
   */
  @Get("profile")
  @UseGuards(new Authenticated("/auth/register"))
  @Render("profile")
  public index(): Record<string, never> {
    return {}
  }
}
