import { faker } from "@faker-js/faker"
import { ManagedDatabaseModule } from "@neomaventures/managed-database"
import { Test } from "@nestjs/testing"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { type Storable } from "./interfaces/storable.interface"
import { StorageModule } from "./storage.module"

@Entity()
class TestFile implements Storable {
  @PrimaryGeneratedColumn()
  public id!: number

  @Column()
  public originalName!: string

  @Column()
  public mimeType!: string

  @Column()
  public size!: number

  @Column()
  public key!: string

  @Column()
  public bucket!: string
}

describe("StorageModule", () => {
  const options = {
    endpoint: faker.internet.url(),
    region: faker.location.countryCode(),
    bucket: faker.string.alphanumeric(10),
    accessKeyId: faker.string.alphanumeric(20),
    secretAccessKey: faker.string.alphanumeric(40),
    entity: TestFile,
  }

  describe("forRoot", () => {
    it("should compile the module", async () => {
      const module = await Test.createTestingModule({
        imports: [
          ManagedDatabaseModule.forRoot([TestFile]),
          StorageModule.forRoot(options),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })

  describe("forRootAsync", () => {
    it("should compile the module", async () => {
      const module = await Test.createTestingModule({
        imports: [
          ManagedDatabaseModule.forRoot([TestFile]),
          StorageModule.forRootAsync({
            useFactory: () => options,
          }),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })
})
