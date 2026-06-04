import { faker } from "@faker-js/faker"

import { type Authenticatable } from "../../src/interfaces/authenticatable.interface"

/**
 * Creates a random {@link Authenticatable} principal.
 *
 * @param overrides - Optional partial overrides for specific properties.
 * @returns A principal suitable for unit and e2e tests.
 */
export function principal(
  overrides?: Partial<Authenticatable>,
): Authenticatable {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    ...overrides,
  }
}
