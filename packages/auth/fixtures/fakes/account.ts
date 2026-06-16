import { faker } from "@faker-js/faker"

import { Account } from "../../src/entities/account.entity"

/**
 * Creates a random {@link Account} for tests.
 *
 * @param overrides - Optional partial overrides for specific properties.
 * @returns An Account instance suitable for unit and e2e tests.
 */
export function account(overrides?: Partial<Account>): Account {
  const a = new Account()
  a.id = faker.string.uuid()
  a.email = faker.internet.email()
  a.permissions = []
  Object.assign(a, overrides)
  return a
}
