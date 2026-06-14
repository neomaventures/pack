import { Authenticated, Principal } from "@neomaventures/auth"
import { Controller, Get } from "@nestjs/common"

import { User } from "../user.entity"

/**
 * A test Controller for accessing the authenticated user
 * using Auth's @Authenticated decorator and Principal decorator.
 */
@Controller("me")
@Authenticated()
export class MeController {
  /**
   * Returns the authenticated user's id and email.
   *
   * @param user - The authenticated user from the Principal decorator
   * @returns An object containing the user's id and email
   */
  @Get()
  public get(@Principal() user: User): { id: string; email: string } {
    return {
      id: user.id,
      email: user.email,
    }
  }
}
