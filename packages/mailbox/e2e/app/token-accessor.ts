import { Injectable } from "@nestjs/common"

import { type TokenAccessor } from "@neomaventures/mailbox"

/**
 * E2E `TokenAccessor` — pulls the access token from a `token` field on the
 * test's account principal. Real consumers route this through their own
 * token store (e.g. `@neomaventures/auth`'s `OAuthToken` entity).
 */
@Injectable()
export class TestTokenAccessor implements TokenAccessor {
  public async getToken(account: {
    id: unknown
    token: string
  }): Promise<string> {
    return account.token
  }
}
