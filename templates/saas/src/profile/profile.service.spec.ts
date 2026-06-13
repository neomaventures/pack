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
        {
          provide: getRepositoryToken(Upload),
          useValue: datasource.getRepository(Upload),
        },
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

  describe("setAvatar()", () => {
    describe("Given an account and a persisted Upload", () => {
      it("should persist the Upload as the account's avatar", async () => {
        const uploads = datasource.getRepository(Upload)
        const account = await accounts.save(
          accounts.create({ email: faker.internet.email() }),
        )
        const upload = await uploads.save(
          uploads.create({
            originalName: "avatar.jpg",
            mimeType: "image/jpeg",
            size: faker.number.int({ min: 100, max: 1_000 }),
            key: `accounts/${account.id}/avatar`,
            bucket: "test-bucket",
          }),
        )

        await service.setAvatar(account, upload)

        const reloaded = await accounts.findOneBy({ id: account.id })
        expect(reloaded?.avatar).toMatchObject({ id: upload.id })
      })
    })
  })
})
