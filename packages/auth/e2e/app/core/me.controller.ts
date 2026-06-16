import { Controller, Get } from "@nestjs/common"

import {
  Account,
  Authenticated,
  CurrentAccount,
  type AuthenticatableProfile,
} from "@neomaventures/auth"

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

  /**
   * Returns the authenticated account with provider profile data, used by
   * e2e specs that need to assert post-auth side effects (e.g. Google
   * profile claims persisted on `Account.authProfile`).
   */
  @Get("detailed")
  public detailed(@CurrentAccount() account: Account): {
    id: string
    email: string
    authProfile?: AuthenticatableProfile | null
  } {
    return {
      id: account.id,
      email: account.email,
      authProfile: account.authProfile,
    }
  }
}
