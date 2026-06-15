import { Account, Authenticated, Principal } from "@neomaventures/auth"
import { Controller, Get } from "@nestjs/common"

/**
 * A test Controller for accessing the authenticated account
 * using Auth's @Authenticated decorator and Principal decorator.
 */
@Controller("me")
@Authenticated()
export class MeController {
  /**
   * Returns the authenticated account's id and email.
   *
   * @param account - The authenticated account from the Principal decorator
   * @returns An object containing the account's id and email
   */
  @Get()
  public get(@Principal() account: Account): { id: string; email: string } {
    return {
      id: account.id,
      email: account.email,
    }
  }
}
