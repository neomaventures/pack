import { type DynamicModule, Module } from "@nestjs/common"
import { getDataSourceToken } from "@nestjs/typeorm"
import { type DataSource, type DataSourceOptions } from "typeorm"

import { managedDatasourceInstance } from "./index"

/**
 * A `@Global()` NestJS test module that exposes a managed in-memory SQLite
 * `DataSource` under TypeORM's standard `getDataSourceToken()`, sharing the
 * per-test cache + `afterEach` teardown of {@link managedDatasourceInstance}.
 *
 * Global by design — this is a test fixture, not production code. The test
 * scope is small and visible (everything in `Test.createTestingModule.imports`
 * is right at the call site), and the global flag is what makes the datasource
 * reachable by `@Global()` modules under test (e.g. `StorageModule`) whose
 * internals inject it across the global boundary.
 */
@Module({})
export class ManagedDatabaseModule {
  /**
   * Wires the managed test datasource into a NestJS testing module.
   *
   * @param entities - TypeORM entities to register on the datasource.
   * @returns A `DynamicModule` exporting the `DataSource` under
   *   `getDataSourceToken()`, visible globally.
   *
   * @example
   * ```typescript
   * const module = await Test.createTestingModule({
   *   imports: [
   *     ManagedDatabaseModule.forRoot([TestFile]),
   *     StorageModule.forRoot(options),
   *   ],
   * }).compile()
   * ```
   */
  public static forRoot(
    entities: DataSourceOptions["entities"],
  ): DynamicModule {
    return {
      module: ManagedDatabaseModule,
      global: true,
      providers: [
        {
          provide: getDataSourceToken(),
          useFactory: (): Promise<DataSource> =>
            managedDatasourceInstance(entities),
        },
      ],
      exports: [getDataSourceToken()],
    }
  }
}
