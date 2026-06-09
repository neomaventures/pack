import { ConfigService, type TypedConfig } from "@neomaventures/config"
import { Module } from "@nestjs/common"
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm"

/** Environment variables for database configuration. */
interface DatabaseConfig {
  /** Database connection URI — `postgresql://...` for production, `:memory:` for dev/test. */
  databaseUri: string
  /** PEM-encoded CA certificate for SSL database connections. */
  databaseCaCert: string
}

/**
 * Removes the `sslmode` query parameter from a Postgres connection URI.
 *
 * The `pg` driver has a known bug where `sslmode` in the connection string
 * overwrites the `ssl` config object instead of merging with it. Stripping
 * it lets our explicit `ssl: { ca }` config take effect.
 *
 * @see https://github.com/brianc/node-postgres/issues/2558
 */
function stripSslMode(uri: string): string {
  const url = new URL(uri)
  url.searchParams.delete("sslmode")
  return url.toString()
}

/**
 * Returns TypeORM configuration based on the database URI.
 *
 * PostgreSQL URIs (`postgresql://...` or `postgres://...`) produce a
 * production config with `synchronize: false`. All other values
 * (including `:memory:`) produce a SQLite config with `synchronize: true`.
 *
 * @param uri - The database connection URI.
 * @param caCert - PEM-encoded CA certificate. When provided, enables SSL.
 * @returns TypeORM module options for the detected database type.
 */
export function databaseOptions(
  uri: string,
  caCert?: string,
): TypeOrmModuleOptions {
  if (uri?.startsWith("postgres")) {
    return {
      type: "postgres",
      url: stripSslMode(uri),
      autoLoadEntities: true,
      synchronize: false,
      ssl: caCert ? { ca: caCert } : { rejectUnauthorized: false },
    }
  }

  return {
    type: "sqlite",
    database: uri,
    autoLoadEntities: true,
    synchronize: true,
  }
}

/**
 * Database module for the SaaS template.
 *
 * Configures TypeORM based on the `DATABASE_URI` environment variable.
 * PostgreSQL URIs (`postgresql://` or `postgres://`) select a production
 * Postgres connection; all other values (including `:memory:`) select SQLite.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: TypedConfig<DatabaseConfig>): TypeOrmModuleOptions =>
        databaseOptions(
          config.databaseUri || ":memory:",
          config.databaseCaCert || undefined,
        ),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
