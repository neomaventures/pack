import { faker } from "@faker-js/faker"
import { Injectable } from "@nestjs/common"

import { type TokenAccessor } from "../../src/interfaces/token-accessor.interface"

/**
 * Stub {@link TokenAccessor} for unit specs in the mailbox package. Returns
 * a random token on every call — used by module specs that only care about
 * wiring, not the token's value. Specs that need to control the resolved
 * token use the e2e `TestTokenAccessor` instead.
 */
@Injectable()
export class StubTokenAccessor implements TokenAccessor {
  public async getToken(): Promise<string> {
    return faker.string.alphanumeric(40)
  }
}
