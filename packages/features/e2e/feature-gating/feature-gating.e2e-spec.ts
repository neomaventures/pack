import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { OK, NOT_FOUND, NO_CONTENT } = HttpStatus

const appModules: [string, string][] = [
  ["forRoot", "e2e/app/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`Feature gating (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance(modulePath)
    })

    describe("Given a route without the @Feature decorator applied", () => {
      it("Then it should be accessible", async () => {
        const server = app.getHttpServer()
        await request(server).get("/status").expect(NO_CONTENT)
      })
    })

    describe("Given a route with the @Feature('ENABLED_FEATURE') decorator applied", () => {
      describe("And with the flag 'ENABLED_FEATURE' set to true", () => {
        it("Then it should respond with a 200", async () => {
          const server = app.getHttpServer()
          await request(server).get("/enabled").expect(OK)
        })
      })
    })

    describe("Given a route with the @Feature('DISABLED_FEATURE') decorator applied", () => {
      describe("And with the flag 'DISABLED_FEATURE' set to false", () => {
        it("Then it should respond with a 404", async () => {
          const server = app.getHttpServer()
          await request(server).get("/disabled").expect(NOT_FOUND)
        })
      })
    })

    describe("Given a route with the @Feature('MISSING_FEATURE') decorator applied", () => {
      describe("And with the flag 'MISSING_FEATURE' not set", () => {
        it("Then it should respond with a 404 (fail-closed)", async () => {
          const server = app.getHttpServer()
          await request(server).get("/missing").expect(NOT_FOUND)
        })
      })
    })

    describe("Given a controller with the @Feature('DISABLED_FEATURE') decorator applied", () => {
      describe("And with the flag 'DISABLED_FEATURE' set to false", () => {
        it("Then it should respond with a 404", async () => {
          const server = app.getHttpServer()
          await request(server).get("/gated").expect(NOT_FOUND)
        })
      })

      describe("And a handler overrides with @Feature('ENABLED_FEATURE')", () => {
        describe("And with the flag 'ENABLED_FEATURE' set to true", () => {
          it("Then the handler-level flag wins and it should respond with a 200", async () => {
            const server = app.getHttpServer()
            await request(server).get("/gated/override").expect(OK)
          })
        })
      })
    })

    describe("Given a controller with @Feature('ENABLED_FEATURE') set to true", () => {
      describe("And a handler overrides with @Feature('MISSING_FEATURE')", () => {
        describe("And with the flag 'MISSING_FEATURE' not set", () => {
          it("Then the handler-level flag wins and it should respond with a 404", async () => {
            const server = app.getHttpServer()
            await request(server)
              .get("/gated-enabled/handler-missing")
              .expect(NOT_FOUND)
          })
        })
      })
    })

    describe("When GET /dynamic is gated on a dynamic feature the resolver enables", () => {
      describe("And the resolver returns DYNAMIC_FEATURE: true", () => {
        it("Then it responds with a 200", async () => {
          const server = app.getHttpServer()
          await request(server).get("/dynamic").expect(OK)
        })
      })
    })

    describe("When GET /dynamic-disabled is gated on a dynamic feature the resolver disables", () => {
      describe("And the resolver returns DYNAMIC_DISABLED: false", () => {
        it("Then it responds with a 404", async () => {
          const server = app.getHttpServer()
          await request(server).get("/dynamic-disabled").expect(NOT_FOUND)
        })
      })
    })

    describe("Given a controller with @Feature('MISSING_FEATURE') not set", () => {
      describe("And a handler overrides with @Feature('ALSO_MISSING')", () => {
        describe("And with the flag 'ALSO_MISSING' not set", () => {
          it("Then it should respond with a 404", async () => {
            const server = app.getHttpServer()
            await request(server)
              .get("/gated-missing/handler-also-missing")
              .expect(NOT_FOUND)
          })
        })
      })
    })
  })
})
