import { faker } from "@faker-js/faker"
import { Test } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { CerberusModule } from "./cerberus.module"
import { type Storable } from "./interfaces/storable.interface"

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

describe("CerberusModule", () => {
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
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [TestFile],
            synchronize: true,
          }),
          CerberusModule.forRoot(options),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })

  describe("forRootAsync", () => {
    it("should compile the module", async () => {
      const module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [TestFile],
            synchronize: true,
          }),
          CerberusModule.forRootAsync({
            useFactory: () => options,
          }),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })
})
