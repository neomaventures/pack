import { Injectable } from "@nestjs/common"

import { type TokenAccessor } from "@neomaventures/mailbox"

/**
 * E2E `TokenAccessor` — resolves tokens from a static, in-memory map keyed
 * by account id. Specs call the static {@link register} method before each
 * request to declare which token mailbox should resolve for a given
 * `accountId`. A static map keeps the spec wiring trivial: no `app.get()`
 * dance, no instance plumbing through Nest DI.
 *
 * Real consumers route token resolution through their own store
 * (e.g. `@neomaventures/auth`'s `OAuthToken` entity).
 */
@Injectable()
export class TestTokenAccessor implements TokenAccessor {
  private static readonly tokens = new Map<string, string>()

  public static register(accountId: string, token: string): void {
    TestTokenAccessor.tokens.set(accountId, token)
  }

  public static reset(): void {
    TestTokenAccessor.tokens.clear()
  }

  public async getToken<T extends { id: unknown }>(
    account: T,
  ): Promise<string> {
    const token = TestTokenAccessor.tokens.get(String(account.id))
    if (!token) {
      throw new Error(`No token registered for account ${String(account.id)}`)
    }
    return token
  }
}
