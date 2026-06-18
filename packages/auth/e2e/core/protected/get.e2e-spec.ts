import { faker } from "@faker-js/faker"
import { MailpitClient } from "@neomaventures/mailpit"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { authenticateViaEmail } from "fixtures/fakes/magic-link"
import request from "supertest"
import { DataSource } from "typeorm"

const { OK, UNAUTHORIZED, FORBIDDEN } = HttpStatus
const mailpit = new MailpitClient(process.env.MAILPIT_API!)

const unauthorizedBody = (
  resource: string,
): { statusCode: number; message: string; error: string } => ({
  statusCode: UNAUTHORIZED,
  message: `Unauthenticated, access to resource ${resource} denied`,
  error: "Unauthorized",
})

const appModules: [string, string][] = [
  ["forRoot", "e2e/app/core/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/core/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`GET /protected/* (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>
    let datasource: DataSource

    beforeEach(async () => {
      app = await managedAppInstance(modulePath)
      datasource = app.get(DataSource)
    })

    afterEach(() => mailpit.clear())

    const createUserWithPermissions = async (
      permissions: string[],
    ): Promise<{ id: string; email: string; token: string }> => {
      const { token, account } = await authenticateViaEmail(
        app,
        faker.internet.email(),
      )

      const repo = datasource.getRepository("Account")
      await repo.update(account.id, { permissions })

      return { id: account.id, email: account.email, token }
    }

    describe("Given a route /protected/articles requiring read:articles", () => {
      describe("When an unauthenticated request is made", () => {
        it("should respond with HTTP 401", async () => {
          await request(app.getHttpServer())
            .get("/protected/articles")
            .expect(UNAUTHORIZED)
            .expect(unauthorizedBody("/protected/articles"))
        })
      })

      describe("When a request is made as an account with write:articles", () => {
        it("should respond with HTTP 403", async () => {
          const { token } = await createUserWithPermissions(["write:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: read:articles is required.",
              requiredPermissions: ["read:articles"],
              permissions: ["write:articles"],
            })
        })
      })

      describe("When a request is made as an account with no permissions", () => {
        it("should respond with HTTP 403", async () => {
          const { token } = await createUserWithPermissions([])

          await request(app.getHttpServer())
            .get("/protected/articles")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: read:articles is required.",
              requiredPermissions: ["read:articles"],
              permissions: [],
            })
        })
      })

      describe("When a request is made as an account with read:articles", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["read:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "read:articles" })
        })
      })

      describe("When a request is made as an account with *", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["*"])

          await request(app.getHttpServer())
            .get("/protected/articles")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "read:articles" })
        })
      })

      describe("When a request is made as an account with *:articles", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["*:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "read:articles" })
        })
      })

      describe("When a request is made as an account with read:*", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["read:*"])

          await request(app.getHttpServer())
            .get("/protected/articles")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "read:articles" })
        })
      })
    })

    describe("Given a route /protected/articles/edit requiring read:articles and write:articles", () => {
      describe("When an unauthenticated request is made", () => {
        it("should respond with HTTP 401", async () => {
          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .expect(UNAUTHORIZED)
            .expect(unauthorizedBody("/protected/articles/edit"))
        })
      })

      describe("When a request is made as an account with neither required permission", () => {
        it("should respond with HTTP 403 listing all missing permissions", async () => {
          const { token } = await createUserWithPermissions(["delete:users"])

          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message:
                "Permission denied: read:articles, write:articles is required.",
              requiredPermissions: ["read:articles", "write:articles"],
              permissions: ["delete:users"],
            })
        })
      })

      describe("When a request is made as an account with only read:articles", () => {
        it("should respond with HTTP 403 for missing write:articles", async () => {
          const { token } = await createUserWithPermissions(["read:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: write:articles is required.",
              requiredPermissions: ["write:articles"],
              permissions: ["read:articles"],
            })
        })
      })

      describe("When a request is made as an account with only write:articles", () => {
        it("should respond with HTTP 403 for missing read:articles", async () => {
          const { token } = await createUserWithPermissions(["write:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: read:articles is required.",
              requiredPermissions: ["read:articles"],
              permissions: ["write:articles"],
            })
        })
      })

      describe("When a request is made as an account with read:articles and write:articles", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions([
            "read:articles",
            "write:articles",
          ])

          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "edit:articles" })
        })
      })

      describe("When a request is made as an account with *:articles", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["*:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "edit:articles" })
        })
      })

      describe("When a request is made as an account with *", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["*"])

          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "edit:articles" })
        })
      })

      describe("When a request is made as an account with read:*", () => {
        it("should respond with HTTP 403 for missing write:articles", async () => {
          const { token } = await createUserWithPermissions(["read:*"])

          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: write:articles is required.",
              requiredPermissions: ["write:articles"],
              permissions: ["read:*"],
            })
        })
      })

      describe("When a request is made as an account with write:*", () => {
        it("should respond with HTTP 403 for missing read:articles", async () => {
          const { token } = await createUserWithPermissions(["write:*"])

          await request(app.getHttpServer())
            .get("/protected/articles/edit")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: read:articles is required.",
              requiredPermissions: ["read:articles"],
              permissions: ["write:*"],
            })
        })
      })
    })

    describe("Given a route /protected/articles/delete requiring admin or delete:articles", () => {
      describe("When an unauthenticated request is made", () => {
        it("should respond with HTTP 401", async () => {
          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .expect(UNAUTHORIZED)
            .expect(unauthorizedBody("/protected/articles/delete"))
        })
      })

      describe("When a request is made as an account with neither admin nor delete:articles", () => {
        it("should respond with HTTP 403", async () => {
          const { token } = await createUserWithPermissions(["read:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message:
                "Permission denied: admin | delete:articles is required.",
              requiredPermissions: ["admin", "delete:articles"],
              permissions: ["read:articles"],
            })
        })
      })

      describe("When a request is made as an account with admin", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["admin"])

          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "delete:articles" })
        })
      })

      describe("When a request is made as an account with delete:articles", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["delete:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "delete:articles" })
        })
      })

      describe("When a request is made as an account with admin and delete:articles", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions([
            "admin",
            "delete:articles",
          ])

          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "delete:articles" })
        })
      })

      describe("When a request is made as an account with *", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["*"])

          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "delete:articles" })
        })
      })

      describe("When a request is made as an account with *:articles", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["*:articles"])

          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "delete:articles" })
        })
      })

      describe("When a request is made as an account with delete:*", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions(["delete:*"])

          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "delete:articles" })
        })
      })

      describe("When a request is made as an account with no permissions", () => {
        it("should respond with HTTP 403", async () => {
          const { token } = await createUserWithPermissions([])

          await request(app.getHttpServer())
            .get("/protected/articles/delete")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message:
                "Permission denied: admin | delete:articles is required.",
              requiredPermissions: ["admin", "delete:articles"],
              permissions: [],
            })
        })
      })
    })

    describe("Given a route /protected/reports requiring read:reports and (admin or write:reports)", () => {
      describe("When an unauthenticated request is made", () => {
        it("should respond with HTTP 401", async () => {
          await request(app.getHttpServer())
            .get("/protected/reports")
            .expect(UNAUTHORIZED)
            .expect(unauthorizedBody("/protected/reports"))
        })
      })

      describe("When a request is made as an account with only read:reports", () => {
        it("should respond with HTTP 403", async () => {
          const { token } = await createUserWithPermissions(["read:reports"])

          await request(app.getHttpServer())
            .get("/protected/reports")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: admin | write:reports is required.",
              requiredPermissions: ["admin", "write:reports"],
              permissions: ["read:reports"],
            })
        })
      })

      describe("When a request is made as an account with only admin", () => {
        it("should respond with HTTP 403", async () => {
          const { token } = await createUserWithPermissions(["admin"])

          await request(app.getHttpServer())
            .get("/protected/reports")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: read:reports is required.",
              requiredPermissions: ["read:reports"],
              permissions: ["admin"],
            })
        })
      })

      describe("When a request is made as an account with read:reports and admin", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions([
            "read:reports",
            "admin",
          ])

          await request(app.getHttpServer())
            .get("/protected/reports")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "read:reports" })
        })
      })

      describe("When a request is made as an account with read:reports and write:reports", () => {
        it("should respond with HTTP 200", async () => {
          const { token } = await createUserWithPermissions([
            "read:reports",
            "write:reports",
          ])

          await request(app.getHttpServer())
            .get("/protected/reports")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "read:reports" })
        })
      })
    })

    describe("Given a controller /admin/* requiring read:admin, with /admin/settings also requiring write:admin", () => {
      describe("When an unauthenticated request is made", () => {
        it("should respond with HTTP 401 for /admin/dashboard", async () => {
          await request(app.getHttpServer())
            .get("/admin/dashboard")
            .expect(UNAUTHORIZED)
            .expect(unauthorizedBody("/admin/dashboard"))
        })

        it("should respond with HTTP 401 for /admin/settings", async () => {
          await request(app.getHttpServer())
            .get("/admin/settings")
            .expect(UNAUTHORIZED)
            .expect(unauthorizedBody("/admin/settings"))
        })
      })

      describe("When a request is made as an account with an unrelated permission", () => {
        it("should respond with HTTP 403 for /admin/dashboard", async () => {
          const { token } = await createUserWithPermissions(["read:articles"])

          await request(app.getHttpServer())
            .get("/admin/dashboard")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: read:admin is required.",
              requiredPermissions: ["read:admin"],
              permissions: ["read:articles"],
            })
        })
      })

      describe("When a request is made as an account with read:admin", () => {
        it("should respond with HTTP 200 for /admin/dashboard", async () => {
          const { token } = await createUserWithPermissions(["read:admin"])

          await request(app.getHttpServer())
            .get("/admin/dashboard")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "admin:dashboard" })
        })

        it("should respond with HTTP 403 for /admin/settings (also requires write:admin)", async () => {
          const { token } = await createUserWithPermissions(["read:admin"])

          await request(app.getHttpServer())
            .get("/admin/settings")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: write:admin is required.",
              requiredPermissions: ["write:admin"],
              permissions: ["read:admin"],
            })
        })
      })

      describe("When a request is made as an account with write:admin", () => {
        it("should respond with HTTP 403 for /admin/settings (also requires read:admin from class)", async () => {
          const { token } = await createUserWithPermissions(["write:admin"])

          await request(app.getHttpServer())
            .get("/admin/settings")
            .set("Authorization", `Bearer ${token}`)
            .expect(FORBIDDEN)
            .expect({
              statusCode: FORBIDDEN,
              message: "Permission denied: read:admin is required.",
              requiredPermissions: ["read:admin"],
              permissions: ["write:admin"],
            })
        })
      })

      describe("When a request is made as an account with read:admin and write:admin", () => {
        it("should respond with HTTP 200 for /admin/settings", async () => {
          const { token } = await createUserWithPermissions([
            "read:admin",
            "write:admin",
          ])

          await request(app.getHttpServer())
            .get("/admin/settings")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "admin:settings" })
        })
      })

      describe("When a request is made as an account with *", () => {
        it("should respond with HTTP 200 for both endpoints", async () => {
          const { token } = await createUserWithPermissions(["*"])

          await request(app.getHttpServer())
            .get("/admin/dashboard")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "admin:dashboard" })

          await request(app.getHttpServer())
            .get("/admin/settings")
            .set("Authorization", `Bearer ${token}`)
            .expect(OK)
            .expect({ action: "admin:settings" })
        })
      })
    })
  })
})
