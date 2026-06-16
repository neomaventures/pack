import { Controller, Get } from "@nestjs/common"

import {
  Account,
  Authenticated,
  AuthenticatedAccount,
  type OAuthProfile,
} from "@neomaventures/auth"

/**
 * A test Controller for accessing the authenticated account
 * using Auth's @Authenticated decorator and @AuthenticatedAccount decorator.
 */
@Controller("me")
@Authenticated()
export class MeController {
  /**
   * Returns the authenticated account's id and email.
   *
   * @param account - The authenticated account from the @AuthenticatedAccount decorator
   * @returns An object containing the account's id and email
   */
  @Get()
  public get(@AuthenticatedAccount() account: Account): {
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
  public detailed(@AuthenticatedAccount() account: Account): {
    id: string
    email: string
    authProfile?: OAuthProfile | null
  } {
    return {
      id: account.id,
      email: account.email,
      authProfile: account.authProfile,
    }
  }
}
