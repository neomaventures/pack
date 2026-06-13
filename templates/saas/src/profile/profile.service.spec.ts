import { faker } from "@faker-js/faker"
import { managedDatasourceInstance } from "@neomaventures/managed-database"
import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { type DataSource, type Repository } from "typeorm"

import { Account } from "~auth/account.entity"
import { ProfileService } from "~profile/profile.service"
import { Upload } from "~profile/upload.entity"

describe("ProfileService", () => {
  let datasource: DataSource
  let service: ProfileService
  let accounts: Repository<Account>

  beforeEach(async () => {
    datasource = await managedDatasourceInstance([Account, Upload])
    accounts = datasource.getRepository(Account)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(Account), useValue: accounts },
      ],
    }).compile()

    service = module.get<ProfileService>(ProfileService)
  })

  describe("getAvatar()", () => {
    describe("Given an account exists with no avatar", () => {
      it("should return null", async () => {
        const account = await accounts.save(
          accounts.create({ email: faker.internet.email() }),
        )

        const result = await service.getAvatar(account.id)

        expect(result).toBeNull()
      })
    })
  })
})
