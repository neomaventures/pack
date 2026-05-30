import { faker } from "@faker-js/faker"
import { UpdatedBy } from "@neoma/audit"
import {
  Column,
  DataSource,
  Entity,
  PrimaryGeneratedColumn,
  type Repository,
} from "typeorm"

import { auditStore } from "../argos.store"

@Entity()
class TestEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column({ default: "" })
  public name!: string

  @UpdatedBy()
  public updatedBy!: string
}

describe("@UpdatedBy()", () => {
  let dataSource: DataSource
  let repository: Repository<TestEntity>

  beforeEach(async () => {
    dataSource = new DataSource({
      type: "sqlite",
      database: ":memory:",
      entities: [TestEntity],
      synchronize: true,
    })
    await dataSource.initialize()
    repository = dataSource.getRepository(TestEntity)
  })

  afterEach(async () => {
    await dataSource.destroy()
  })

  describe("Given no ALS context", () => {
    it("should set the column to 'system' on insert", async () => {
      const entity = await repository.save(repository.create({}))

      expect(entity.updatedBy).toBe("system")
    })
  })

  describe("Given an ALS context with an actor", () => {
    it("should set the column to the actor on insert", async () => {
      const actor = `principal:${faker.string.uuid()}`

      const entity = await auditStore.run({ actor }, () =>
        repository.save(repository.create({})),
      )

      expect(entity.updatedBy).toBe(actor)
    })

    it("should update the column to the new actor on update", async () => {
      const createActor = `principal:${faker.string.uuid()}`
      const updateActor = `principal:${faker.string.uuid()}`

      const entity = await auditStore.run({ actor: createActor }, () =>
        repository.save(repository.create({})),
      )

      entity.name = faker.commerce.productName()
      await auditStore.run({ actor: updateActor }, () =>
        repository.save(entity),
      )

      const stored = await repository.findOneByOrFail({ id: entity.id })

      expect(stored.updatedBy).toBe(updateActor)
    })
  })
})
