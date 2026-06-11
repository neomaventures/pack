import { faker } from "@faker-js/faker"
import { google as googleFakes } from "@neomaventures/google-fixtures"

import { type GoogleAuthOptions, type GoogleAuthResult } from "../../src"
import { type Authenticatable } from "../../src/interfaces/authenticatable.interface"

const { helpers, internet, person, string } = faker
const PASSWORD_MIN_LENGTH = 8

const principal = (overrides?: Partial<Authenticatable>): Authenticatable => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  ...overrides,
})

const googleAuthResult = (
  overrides: Partial<GoogleAuthResult<any>> = {},
): GoogleAuthResult<any> => ({
  entity: { id: string.uuid(), email: internet.email() },
  isNewUser: true,
  profile: {
    sub: string.numeric(10),
    name: person.fullName(),
    picture: internet.url(),
  },
  ...overrides,
})

const googleAuthOptions = (
  overrides: Partial<GoogleAuthOptions> = {},
): GoogleAuthOptions => ({
  clientId: googleFakes.clientId(),
  clientSecret: googleFakes.clientSecret(),
  redirectUri: internet.url(),
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  ...overrides,
})

const password = (): string => {
  const alpha = string.alpha(PASSWORD_MIN_LENGTH - 3).toLowerCase()
  const alphaUpper = string.alpha({ length: { min: 1, max: 5 } }).toUpperCase()
  const numeric = string.numeric({ length: { min: 1, max: 5 } })
  const symbol = string.symbol({ min: 1, max: 5 })
  return `${alphaUpper}${alpha}${numeric}${symbol}`
}

const weakPasswords = (): Array<string> => {
  const passwords = [
    string.alpha(PASSWORD_MIN_LENGTH),
    string.numeric(PASSWORD_MIN_LENGTH),
    string.symbol(PASSWORD_MIN_LENGTH),
    string.alphanumeric(PASSWORD_MIN_LENGTH),
    `${string.alpha(PASSWORD_MIN_LENGTH - 1)}${string.symbol()}`,
    `${string.numeric(PASSWORD_MIN_LENGTH - 1)}${string.symbol()}`,
    `${string.alphanumeric(PASSWORD_MIN_LENGTH - 2)}${string.symbol()}`,
  ]

  if (process.env.NODE_ENV === "CI") {
    return helpers.arrayElements(passwords, 2)
  }

  return passwords
}

const invalidEmails = (): Array<string> => {
  return [
    person.firstName(),
    `${person.firstName()}@`,
    `${person.firstName()}@${internet.domainWord()}`,
    `${person.firstName()}@${internet.domainWord()}.`,
    `${person.firstName()}@${internet.domainWord()}.c`,
  ]
}

export const factories = {
  principal,
  googleAuthResult,
  googleAuthOptions,
  password,
  weakPasswords,
  invalidEmails,
}
