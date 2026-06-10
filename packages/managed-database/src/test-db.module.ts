import { Global, Module, type Type } from "@nestjs/common"
import { getDataSourceToken } from "@nestjs/typeorm"
import { type DataSource, type DataSourceOptions } from "typeorm"

import { managedDatasourceInstance } from "./index"

/**
 * Builds a `@Global()` NestJS module that exposes a managed in-memory SQLite
 * `DataSource` under TypeORM's standard `getDataSourceToken()`, sharing the
 * per-test cache + `afterEach` teardown of {@link managedDatasourceInstance}.
 *
 * Use this when a NestJS module under test is itself `@Global()` (for example
 * `StorageModule`) and its internals inject the datasource — a non-global
 * provider declared on the test module can't cross that boundary.
 *
 * Each call returns a fresh anonymous module class, so tests can compose
 * independent fixtures without provider-token collisions across files.
 *
 * @param entities - TypeORM entities to register on the datasource.
 * @returns A `@Global()` module class that exports `getDataSourceToken()`.
 *
 * @example
 * ```typescript
 * const module = await Test.createTestingModule({
 *   imports: [
 *     createTestDbModule([TestFile]),
 *     StorageModule.forRoot(options),
 *   ],
 * }).compile()
 * ```
 */
export const createTestDbModule = (
  entities: DataSourceOptions["entities"],
): Type<unknown> => {
  @Global()
  @Module({
    providers: [
      {
        provide: getDataSourceToken(),
        useFactory: (): Promise<DataSource> =>
          managedDatasourceInstance(entities),
      },
    ],
    exports: [getDataSourceToken()],
  })
  class TestDbModule {}

  return TestDbModule
}
