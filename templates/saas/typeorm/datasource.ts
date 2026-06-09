import { DataSource } from "typeorm"

// DATABASE_URI is the app's convention (via @neomaventures/config).
// DATABASE_URL is a fallback for providers that use that name by default (e.g. Render, Heroku).
const uri = process.env.DATABASE_URI ?? process.env.DATABASE_URL ?? ""
const caCert = process.env.DATABASE_CA_CERT

export const datasource = new DataSource({
  type: "postgres",
  url: uri,
  ssl: caCert ? { ca: caCert } : { rejectUnauthorized: false },
  entities: ["src/**/*.entity.ts"],
  migrations: ["typeorm/migrations/*.ts"],
})
