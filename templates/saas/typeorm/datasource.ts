import { Account, OAuthToken } from "@neomaventures/auth"
import { DataSource } from "typeorm"

// DATABASE_URI is the app's convention (via @neomaventures/config).
// DATABASE_URL is a fallback for providers that use that name by default (e.g. Render, Heroku).
const uri = process.env.DATABASE_URI ?? process.env.DATABASE_URL ?? ""
const caCert = process.env.DATABASE_CA_CERT

// SSL is enabled when a CA cert is provided or when connecting to a non-localhost host.
// Local Docker Postgres (used by migration-generate.sh) does not support SSL.
const isLocalhost = uri.includes("localhost") || uri.includes("127.0.0.1")
const ssl = caCert ? { ca: caCert } : isLocalhost ? false : { rejectUnauthorized: false }

export const datasource = new DataSource({
  type: "postgres",
  url: uri,
  ssl,
  // Mix of explicit @neomaventures/auth entities (Account, OAuthToken)
  // and consumer-owned entities under src/. TypeORM needs every entity
  // referenced by a relation to be registered, even if the consumer
  // doesn't directly import it.
  entities: [Account, OAuthToken, "src/**/*.entity.ts"],
  migrations: ["typeorm/migrations/*.ts"],
})
