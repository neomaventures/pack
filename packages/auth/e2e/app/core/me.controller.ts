import { Account, Authenticated, CurrentAccount } from "@neomaventures/auth"
import { Controller, Get } from "@nestjs/common"

/**
 * A test Controller for accessing the authenticated account
 * using Auth's @Authenticated decorator and @CurrentAccount decorator.
 */
@Controller("me")
@Authenticated()
export class MeController {
  /**
   * Returns the authenticated account's id and email.
   *
   * @param account - The authenticated account from the @CurrentAccount decorator
   * @returns An object containing the account's id and email
   */
  @Get()
  public get(@CurrentAccount() account: Account): {
    id: string
    email: string
  } {
    return {
      id: account.id,
      email: account.email,
    }
  }
}
