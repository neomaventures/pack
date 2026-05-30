import { faker } from "@faker-js/faker"
import { managedDatasourceInstance } from "@neoma/managed-database"
import { Global, Module } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { getDataSourceToken } from "@nestjs/typeorm"
import {
  Column,
  type DataSource,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm"

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

/**
 * Exposes a managed (cached, auto-torn-down) test DataSource globally so the
 * interceptors inside the global StorageModule can inject it — a root-level
 * provider can't cross that boundary.
 */
@Global()
@Module({
  providers: [
    {
      provide: getDataSourceToken(),
      useFactory: (): Promise<DataSource> =>
        managedDatasourceInstance([TestFile]),
    },
  ],
  exports: [getDataSourceToken()],
})
class GlobalTestDbModule {}

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
        imports: [GlobalTestDbModule, StorageModule.forRoot(options)],
      }).compile()

      expect(module).toBeDefined()
    })
  })

  describe("forRootAsync", () => {
    it("should compile the module", async () => {
      const module = await Test.createTestingModule({
        imports: [
          GlobalTestDbModule,
          StorageModule.forRootAsync({
            useFactory: () => options,
          }),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })
})
