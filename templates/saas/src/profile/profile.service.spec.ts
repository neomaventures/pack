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
  let uploads: Repository<Upload>

  beforeEach(async () => {
    datasource = await managedDatasourceInstance([Account, Upload])
    accounts = datasource.getRepository(Account)
    uploads = datasource.getRepository(Upload)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(Account), useValue: accounts },
        { provide: getRepositoryToken(Upload), useValue: uploads },
      ],
    }).compile()

    service = module.get<ProfileService>(ProfileService)
  })

  describe("setAvatar()", () => {
    describe("Given an account and a new Upload", () => {
      it("should persist the Upload as the account's avatar", async () => {
        const account = await accounts.save(
          accounts.create({ email: faker.internet.email() }),
        )
        const upload = uploads.create({
          originalName: "avatar.jpg",
          mimeType: "image/jpeg",
          size: faker.number.int({ min: 100, max: 1_000 }),
          key: `accounts/${account.id}/avatar`,
          bucket: "test-bucket",
        })

        await service.setAvatar(account, upload)

        const reloaded = await accounts.findOneByOrFail({ id: account.id })
        expect(reloaded.avatar).toMatchObject({
          key: `accounts/${account.id}/avatar`,
          mimeType: "image/jpeg",
        })
      })
    })

    describe("Given an account that already has an avatar", () => {
      it("should replace the avatar with the new Upload", async () => {
        const account = await accounts.save(
          accounts.create({ email: faker.internet.email() }),
        )
        const first = uploads.create({
          originalName: "first.jpg",
          mimeType: "image/jpeg",
          size: 1_024,
          key: `accounts/${account.id}/avatar`,
          bucket: "test-bucket",
        })
        await service.setAvatar(account, first)

        const replacement = uploads.create({
          originalName: "second.png",
          mimeType: "image/png",
          size: 2_048,
          key: `accounts/${account.id}/avatar`,
          bucket: "test-bucket",
        })
        await service.setAvatar(account, replacement)

        const reloaded = await accounts.findOneByOrFail({ id: account.id })
        expect(reloaded.avatar).toMatchObject({ mimeType: "image/png" })
      })
    })
  })
})
