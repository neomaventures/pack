import { faker } from "@faker-js/faker"
import { MailpitClient } from "@neomaventures/mailpit"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { authenticateViaEmail } from "fixtures/fakes/magic-link"
import request from "supertest"

const { OK, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, SEE_OTHER } = HttpStatus

const REDIRECT_BODY = (url: string): Record<string, unknown> => ({
  statusCode: UNAUTHORIZED,
  message: "Unauthorized. Redirecting to login.",
  redirect: { url, status: SEE_OTHER },
})
const mailpit = new MailpitClient(process.env.MAILPIT_API!)

const UNAUTHORIZED_BODY = {
  statusCode: UNAUTHORIZED,
  message:
    "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
  error: "Unauthorized",
}

const defaultAppModules: [string, string][] = [
  ["forRoot", "e2e/app/core/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/core/app.async.module.ts#AsyncAppModule"],
]

const configuredAppModules: [string, string][] = [
  [
    "forRoot",
    "e2e/app/core/app.with-on-unauthenticated.module.ts#AppWithOnUnauthenticatedModule",
  ],
  [
    "forRootAsync",
    "e2e/app/core/app.with-on-unauthenticated.async.module.ts#AsyncAppWithOnUnauthenticatedModule",
  ],
]

describe("GET /unauth/* (@Authenticated onUnauthenticated precedence)", () => {
  afterEach(() => mailpit.clear())

  describe("Under the default app modules (no forRoot.onUnauthenticated)", () => {
    defaultAppModules.forEach(([name, modulePath]) => {
      describe(`(${name})`, () => {
        let app: Awaited<ReturnType<typeof managedAppInstance>>

        beforeEach(async () => {
          app = await managedAppInstance(modulePath)
        })

        describe("GET /unauth/default-401 — @Authenticated() with no options", () => {
          describe("When an unauthenticated request is made", () => {
            it("should respond with HTTP 401", async () => {
              await request(app.getHttpServer())
                .get("/unauth/default-401")
                .expect(UNAUTHORIZED)
                .expect(UNAUTHORIZED_BODY)
            })
          })

          describe("When an authenticated request is made", () => {
            it("should respond with HTTP 200", async () => {
              const { token } = await authenticateViaEmail(
                app,
                faker.internet.email(),
              )

              await request(app.getHttpServer())
                .get("/unauth/default-401")
                .set("Authorization", `Bearer ${token}`)
                .expect(OK)
                .expect({ ok: true })
            })
          })
        })

        describe('GET /unauth/redirect — @Authenticated({ onUnauthenticated: "/login" })', () => {
          describe("When an unauthenticated request is made", () => {
            it("should respond with HTTP 401 carrying the redirect target in the body", async () => {
              await request(app.getHttpServer())
                .get("/unauth/redirect")
                .expect(UNAUTHORIZED)
                .expect(REDIRECT_BODY("/login"))
            })
          })

          describe("When an authenticated request is made", () => {
            it("should respond with HTTP 200", async () => {
              const { token } = await authenticateViaEmail(
                app,
                faker.internet.email(),
              )

              await request(app.getHttpServer())
                .get("/unauth/redirect")
                .set("Authorization", `Bearer ${token}`)
                .expect(OK)
                .expect({ ok: true })
            })
          })
        })

        describe("GET /unauth/not-found — @Authenticated({ onUnauthenticated: NotFoundException })", () => {
          describe("When an unauthenticated request is made", () => {
            it("should respond with HTTP 404", async () => {
              const response = await request(app.getHttpServer())
                .get("/unauth/not-found")
                .expect(NOT_FOUND)

              expect(response.body).toMatchObject({ statusCode: NOT_FOUND })
            })
          })

          describe("When an authenticated request is made", () => {
            it("should respond with HTTP 200", async () => {
              const { token } = await authenticateViaEmail(
                app,
                faker.internet.email(),
              )

              await request(app.getHttpServer())
                .get("/unauth/not-found")
                .set("Authorization", `Bearer ${token}`)
                .expect(OK)
                .expect({ ok: true })
            })
          })
        })

        describe("GET /unauth/forbidden — @Authenticated({ onUnauthenticated: ForbiddenException })", () => {
          describe("When an unauthenticated request is made", () => {
            it("should respond with HTTP 403", async () => {
              const response = await request(app.getHttpServer())
                .get("/unauth/forbidden")
                .expect(FORBIDDEN)

              expect(response.body).toMatchObject({ statusCode: FORBIDDEN })
            })
          })

          describe("When an authenticated request is made", () => {
            it("should respond with HTTP 200", async () => {
              const { token } = await authenticateViaEmail(
                app,
                faker.internet.email(),
              )

              await request(app.getHttpServer())
                .get("/unauth/forbidden")
                .set("Authorization", `Bearer ${token}`)
                .expect(OK)
                .expect({ ok: true })
            })
          })
        })
      })
    })
  })

  describe('Under the configured app modules (forRoot.onUnauthenticated: "/login")', () => {
    configuredAppModules.forEach(([name, modulePath]) => {
      describe(`(${name})`, () => {
        let app: Awaited<ReturnType<typeof managedAppInstance>>

        beforeEach(async () => {
          app = await managedAppInstance(modulePath)
        })

        describe("GET /unauth/default-redirect — @Authenticated() with no per-route options", () => {
          describe("When an unauthenticated request is made", () => {
            it("should respond with HTTP 401 carrying the redirect target in the body (forRoot wins)", async () => {
              await request(app.getHttpServer())
                .get("/unauth/default-redirect")
                .expect(UNAUTHORIZED)
                .expect(REDIRECT_BODY("/login"))
            })
          })

          describe("When an authenticated request is made", () => {
            it("should respond with HTTP 200", async () => {
              const { token } = await authenticateViaEmail(
                app,
                faker.internet.email(),
              )

              await request(app.getHttpServer())
                .get("/unauth/default-redirect")
                .set("Authorization", `Bearer ${token}`)
                .expect(OK)
                .expect({ ok: true })
            })
          })
        })

        describe("GET /unauth/default-redirect-override — @Authenticated({ onUnauthenticated: NotFoundException })", () => {
          describe("When an unauthenticated request is made", () => {
            it("should respond with HTTP 404 (per-route wins over forRoot)", async () => {
              const response = await request(app.getHttpServer())
                .get("/unauth/default-redirect-override")
                .expect(NOT_FOUND)

              expect(response.body).toMatchObject({ statusCode: NOT_FOUND })
            })
          })

          describe("When an authenticated request is made", () => {
            it("should respond with HTTP 200", async () => {
              const { token } = await authenticateViaEmail(
                app,
                faker.internet.email(),
              )

              await request(app.getHttpServer())
                .get("/unauth/default-redirect-override")
                .set("Authorization", `Bearer ${token}`)
                .expect(OK)
                .expect({ ok: true })
            })
          })
        })
      })
    })
  })
})
