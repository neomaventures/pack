import { faker } from "@faker-js/faker"
import { getMetadataArgsStorage } from "typeorm"

import { type Mailboxable } from "../interfaces/mailboxable.interface"

import { MailAccount } from "./mail-account.entity"

describe("MailAccount", () => {
  describe("Given a hydrated instance", () => {
    it("should satisfy the Mailboxable interface", () => {
      const account: Mailboxable = Object.assign(new MailAccount(), {
        id: faker.string.uuid(),
        accountId: faker.string.uuid(),
        gmailAddress: faker.internet.email().toLowerCase(),
      })

      expect(account).toEqual({
        id: expect.any(String),
        accountId: expect.any(String),
        gmailAddress: expect.any(String),
      })
    })
  })

  describe("TypeORM metadata", () => {
    it("should register as the 'mail_account' table", () => {
      const table = getMetadataArgsStorage().tables.find(
        (t) => t.target === MailAccount,
      )

      expect(table?.name).toBe("mail_account")
    })

    it("should declare id, accountId, and gmailAddress columns", () => {
      const columns = getMetadataArgsStorage()
        .columns.filter((c) => c.target === MailAccount)
        .map((c) => c.propertyName)

      expect(columns).toIncludeSameMembers(["id", "accountId", "gmailAddress"])
    })
  })
})
