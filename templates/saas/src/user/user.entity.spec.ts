import { faker } from "@faker-js/faker"
import { managedDatasourceInstance } from "@neomaventures/managed-database"
import { type DataSource, type Repository } from "typeorm"

import { User } from "~user/user.entity"

describe("User", () => {
  let datasource: DataSource
  let repository: Repository<User>

  beforeEach(async () => {
    datasource = await managedDatasourceInstance([User])
    repository = datasource.getRepository(User)
  })

  describe("Given a new user is persisted", () => {
    it("should generate a UUID for the id", async () => {
      const user = repository.create({ email: faker.internet.email() })

      const saved = await repository.save(user)

      expect(saved.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    })

    it("should default permissions to an empty array", async () => {
      const user = repository.create({ email: faker.internet.email() })

      const saved = await repository.save(user)
      const found = await repository.findOneByOrFail({ id: saved.id })

      expect(found.permissions).toEqual([])
    })
  })

  describe("Given a user with permissions", () => {
    it("should persist and retrieve the permissions", async () => {
      const permissions = ["read:articles", "write:articles"]
      const user = repository.create({
        email: faker.internet.email(),
        permissions,
      })

      const saved = await repository.save(user)
      const found = await repository.findOneByOrFail({ id: saved.id })

      expect(found.permissions).toEqual(permissions)
    })
  })

  describe("Given a duplicate email", () => {
    it("should violate the unique constraint", async () => {
      const email = faker.internet.email()
      await repository.save(repository.create({ email }))

      await expect(
        repository.save(repository.create({ email })),
      ).rejects.toThrow()
    })
  })

  describe("Given a missing email", () => {
    it("should violate the not-null constraint", async () => {
      const user = repository.create()

      await expect(repository.save(user)).rejects.toThrow()
    })
  })
})
