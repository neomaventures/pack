import { DataSource, type DataSourceOptions } from "typeorm"

/** Default entities glob — every `.entity.ts` file under `src`. */
const DEFAULT_ENTITIES: DataSourceOptions["entities"] = ["src/**/*.entity.ts"]

/**
 * Create a new datasource for testing that uses an in-memory SQLite database.
 *
 * @param entities - TypeORM entities to register: an array of globs or entity
 *   classes. Defaults to every `.entity.ts` file under `src`.
 * @returns An initialized datasource.
 */
export const datasource = async (
  entities: DataSourceOptions["entities"] = DEFAULT_ENTITIES,
): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities,
    synchronize: true,
  })
  return dataSource.initialize()
}

// Cache of datasources for the current test, keyed by their entities config so
// that distinct configs get distinct instances while repeated calls with the
// same config (within a test) reuse one. Cleared after each test. Mirrors the
// instance-cache pattern in @neomaventures/managed-app.
const datasourceInstances: Record<string, DataSource> = {}

afterEach(async () => {
  for (const key in datasourceInstances) {
    await datasourceInstances[key].destroy()
    delete datasourceInstances[key]
  }
})

const cacheKey = (entities: DataSourceOptions["entities"]): string =>
  JSON.stringify(entities, (_key, value: unknown) =>
    typeof value === "function" ? value.name : value,
  )

/**
 * Provides a managed in-memory SQLite datasource for testing, cached per
 * entities config and torn down after each test.
 *
 * The first call for a given config (within a test) creates and initialises the
 * datasource; subsequent calls with the same config return the cached instance.
 * Different configs get isolated instances. All are destroyed after each test.
 *
 * @param entities - TypeORM entities to register: an array of globs or entity
 *   classes. Defaults to every `.entity.ts` file under `src`.
 *
 * @example
 * ```typescript
 * const ds = await managedDatasourceInstance(["e2e/app/x.entity.ts"])
 * const repo = ds.getRepository(User)
 * ```
 *
 * @returns A Promise resolving to the {@link DataSource} for this config.
 */
export const managedDatasourceInstance = async (
  entities: DataSourceOptions["entities"] = DEFAULT_ENTITIES,
): Promise<DataSource> => {
  const key = cacheKey(entities)

  let instance = datasourceInstances[key]
  if (!instance) {
    instance = await datasource(entities)
    datasourceInstances[key] = instance
  }

  return instance
}
