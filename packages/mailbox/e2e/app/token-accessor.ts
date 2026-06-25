import { Injectable, UnauthorizedException } from "@nestjs/common"

import { type TokenAccessor } from "@neomaventures/mailbox"

/**
 * E2E `TokenAccessor` — resolves a single static "current token" that the
 * spec registers before each request. Mailbox is account-agnostic, so the
 * accessor takes no principal: real consumers resolve "for whom" via
 * ambient request context (e.g. `@neomaventures/request-context`); this
 * test double just hands back whatever the spec registered.
 *
 * Specs call {@link register} to declare the token mailbox should return,
 * and {@link reset} between tests. A static slot keeps the spec wiring
 * trivial — no `app.get()` dance, no instance plumbing through DI.
 */
@Injectable()
export class TestTokenAccessor implements TokenAccessor {
  private static currentToken: string | undefined

  public static register(token: string): void {
    TestTokenAccessor.currentToken = token
  }

  public static reset(): void {
    TestTokenAccessor.currentToken = undefined
  }

  public async getToken(): Promise<string> {
    if (!TestTokenAccessor.currentToken) {
      throw new UnauthorizedException("No token registered")
    }
    return TestTokenAccessor.currentToken
  }
}
