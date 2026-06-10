import { Inject, Injectable, Module } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { getDataSourceToken } from "@nestjs/typeorm"
import { type DataSource } from "typeorm"

import { ManagedDatabaseModule } from "./managed-database.module"
import { Post } from "./post.entity"
import { User } from "./user.entity"

import { managedDatasourceInstance } from "./index"

const targetsOf = (ds: { entityMetadatas: { target: unknown }[] }): unknown[] =>
  ds.entityMetadatas.map((metadata) => metadata.target)

describe("ManagedDatabaseModule", () => {
  describe("forRoot()", () => {
    describe("when imported into a Test module", () => {
      it("resolves an initialised DataSource under getDataSourceToken()", async () => {
        const module = await Test.createTestingModule({
          imports: [ManagedDatabaseModule.forRoot([User])],
        }).compile()

        const ds = module.get<DataSource>(getDataSourceToken())

        expect(ds.isInitialized).toBe(true)
        expect(targetsOf(ds)).toEqual([User])
      })

      it("registers only the entities passed to forRoot", async () => {
        const module = await Test.createTestingModule({
          imports: [ManagedDatabaseModule.forRoot([Post])],
        }).compile()

        const ds = module.get<DataSource>(getDataSourceToken())

        expect(targetsOf(ds)).toEqual([Post])
      })
    })

    describe("global scope", () => {
      it("exposes the datasource to downstream modules without re-import", async () => {
        @Injectable()
        class InjectingService {
          public constructor(
            @Inject(getDataSourceToken()) public readonly ds: DataSource,
          ) {}
        }

        @Module({
          providers: [InjectingService],
          exports: [InjectingService],
        })
        class ConsumerModule {}

        const module = await Test.createTestingModule({
          imports: [ManagedDatabaseModule.forRoot([User]), ConsumerModule],
        }).compile()

        const injecting = module.get(InjectingService)
        const tokenDs = module.get<DataSource>(getDataSourceToken())

        expect(injecting.ds).toBe(tokenDs)
      })
    })

    describe("cache reuse within a test", () => {
      it("yields the same DataSource instance as managedDatasourceInstance for the same entities", async () => {
        const module = await Test.createTestingModule({
          imports: [ManagedDatabaseModule.forRoot([User])],
        }).compile()

        const fromModule = module.get<DataSource>(getDataSourceToken())
        const direct = await managedDatasourceInstance([User])

        expect(fromModule).toBe(direct)
      })
    })
  })
})
