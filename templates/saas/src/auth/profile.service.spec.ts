import { faker } from "@faker-js/faker"
import { Account, OAuthToken } from "@neomaventures/auth"
import { managedDatasourceInstance } from "@neomaventures/managed-database"
import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { type DataSource, type Repository } from "typeorm"

import { Profile } from "~auth/profile.entity"
import { ProfileService } from "~auth/profile.service"
import { Upload } from "~auth/upload.entity"

describe("ProfileService", () => {
  let datasource: DataSource
  let service: ProfileService
  let accounts: Repository<Account>
  let profiles: Repository<Profile>
  let uploads: Repository<Upload>

  beforeEach(async () => {
    datasource = await managedDatasourceInstance([
      Account,
      OAuthToken,
      Upload,
      Profile,
    ])
    accounts = datasource.getRepository(Account)
    profiles = datasource.getRepository(Profile)
    uploads = datasource.getRepository(Upload)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(Profile), useValue: profiles },
      ],
    }).compile()

    service = module.get<ProfileService>(ProfileService)
  })

  describe("getAvatar()", () => {
    describe("Given the account has no profile row", () => {
      it("should return null", async () => {
        const account = await accounts.save(
          accounts.create({ email: faker.internet.email() }),
        )

        await expect(service.getAvatar(account)).resolves.toBeNull()
      })
    })

    describe("Given the account has a profile with an avatar", () => {
      it("should return the Upload", async () => {
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
        await profiles.save(profiles.create({ account, avatar: upload }))

        const result = await service.getAvatar(account)

        expect(result).toEqual(upload)
      })
    })

    describe("Given the account has a profile but no avatar", () => {
      it("should return null", async () => {
        const account = await accounts.save(
          accounts.create({ email: faker.internet.email() }),
        )
        await profiles.save(profiles.create({ account, avatar: null }))

        await expect(service.getAvatar(account)).resolves.toBeNull()
      })
    })
  })

  describe("setAvatar()", () => {
    describe("Given an account with no profile yet", () => {
      it("should create a Profile row with the avatar set", async () => {
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

        const profile = await profiles.findOneOrFail({
          where: { account: { id: account.id } },
        })
        expect(profile.avatar).toEqual(upload)
      })
    })

    describe("Given an account that already has a profile with an avatar", () => {
      it("should replace the avatar with the new Upload", async () => {
        const account = await accounts.save(
          accounts.create({ email: faker.internet.email() }),
        )
        const first = await uploads.save(
          uploads.create({
            originalName: "first.jpg",
            mimeType: "image/jpeg",
            size: 1_024,
            key: `accounts/${account.id}/avatar`,
            bucket: "test-bucket",
          }),
        )
        await service.setAvatar(account, first)

        const replacement = await uploads.save(
          uploads.create({
            originalName: "second.png",
            mimeType: "image/png",
            size: 2_048,
            key: `accounts/${account.id}/avatar-2`,
            bucket: "test-bucket",
          }),
        )
        await service.setAvatar(account, replacement)

        const profile = await profiles.findOneOrFail({
          where: { account: { id: account.id } },
        })
        expect(profile.avatar).toEqual(replacement)
        const all = await profiles.find()
        expect(all).toHaveLength(1)
      })
    })
  })
})
