import { faker } from "@faker-js/faker"

import { Account } from "../../src/entities/account.entity"

/**
 * Creates a random {@link Account} principal for tests.
 *
 * @param overrides - Optional partial overrides for specific properties.
 * @returns An Account instance suitable for unit and e2e tests.
 */
export function principal(overrides?: Partial<Account>): Account {
  const account = new Account()
  account.id = faker.string.uuid()
  account.email = faker.internet.email()
  account.permissions = []
  Object.assign(account, overrides)
  return account
}
