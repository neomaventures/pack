import { DataSource } from "typeorm"

const uri = process.env.DATABASE_URI ?? process.env.DATABASE_URL ?? ""
const caCert = process.env.DATABASE_CA_CERT

export const datasource = new DataSource({
  type: "postgres",
  url: uri,
  ssl: caCert ? { ca: caCert } : { rejectUnauthorized: false },
  entities: ["src/**/*.entity.ts"],
  migrations: ["typeorm/migrations/*.ts"],
})
