import { faker } from "@faker-js/faker"

import { databaseOptions } from "~database/database.module"

describe("DatabaseModule", () => {
  describe("databaseOptions", () => {
    const pgUri = `postgresql://${faker.internet.username()}:${faker.internet.password()}@localhost:5432/${faker.string.alpha(8)}`

    describe("Given a postgresql:// URI without a CA certificate", () => {
      it("should return Postgres options with synchronize disabled", () => {
        const options = databaseOptions(pgUri)

        expect(options).toMatchObject({
          type: "postgres",
          autoLoadEntities: true,
          synchronize: false,
        })
        expect(options).toMatchObject({
          ssl: { rejectUnauthorized: false },
        })
      })
    })

    describe("Given a postgresql:// URI with a CA certificate", () => {
      it("should configure SSL with the CA certificate", () => {
        const caCert = faker.string.alphanumeric(64)
        const options = databaseOptions(pgUri, caCert)

        expect(options).toMatchObject({
          type: "postgres",
          ssl: { ca: caCert },
        })
      })
    })

    describe("Given a postgres:// URI", () => {
      it("should also return Postgres options", () => {
        const shortUri = pgUri.replace("postgresql://", "postgres://")
        const options = databaseOptions(shortUri)

        expect(options).toMatchObject({
          type: "postgres",
          synchronize: false,
        })
      })
    })

    describe("Given a postgres URI with a sslmode query parameter", () => {
      it("should strip sslmode from the returned URL", () => {
        const uriWithSslMode = `${pgUri}?sslmode=require`
        const options = databaseOptions(uriWithSslMode)

        expect((options as Record<string, unknown>).url).not.toContain(
          "sslmode",
        )
      })
    })

    describe("Given :memory:", () => {
      it("should return SQLite options with synchronize enabled", () => {
        const options = databaseOptions(":memory:")

        expect(options).toMatchObject({
          type: "sqlite",
          database: ":memory:",
          autoLoadEntities: true,
          synchronize: true,
        })
      })
    })

    describe("Given a file path", () => {
      it("should return SQLite options", () => {
        const options = databaseOptions("./data.sqlite")

        expect(options).toMatchObject({
          type: "sqlite",
          database: "./data.sqlite",
        })
      })
    })
  })
})
