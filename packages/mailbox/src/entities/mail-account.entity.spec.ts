import { faker } from "@faker-js/faker"
import { managedDatasourceInstance } from "@neomaventures/managed-database"
import { type Repository } from "typeorm"

import { MailAccount } from "./mail-account.entity"

describe("MailAccount", () => {
  const accountId = faker.string.uuid()
  const gmailAddress = faker.internet.email().toLowerCase()
  let repository: Repository<MailAccount>
  let account: MailAccount

  describe(`When it is saved with accountId "${accountId}" and gmailAddress "${gmailAddress}"`, () => {
    beforeEach(async () => {
      const datasource = await managedDatasourceInstance([MailAccount])
      repository = datasource.getRepository(MailAccount)
      const { id } = await repository.save(
        Object.assign(new MailAccount(), { accountId, gmailAddress }),
      )
      account = await repository.findOneOrFail({ where: { id } })
    })

    it("Then it should have an id property set to a uuid", () => {
      expect(account).toHaveProperty("id", expect.any(String))
    })

    it(`Then it should have an accountId property with the value "${accountId}"`, () => {
      expect(account).toHaveProperty("accountId", accountId)
    })

    it(`Then it should have a gmailAddress property with the value "${gmailAddress}"`, () => {
      expect(account).toHaveProperty("gmailAddress", gmailAddress)
    })
  })
})
