import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { OK, NOT_FOUND, NO_CONTENT, FORBIDDEN, I_AM_A_TEAPOT } = HttpStatus

const appModules: [string, string][] = [
  ["forRoot", "e2e/app/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`Feature gating onDeny (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance(modulePath)
    })

    describe("Given a disabled @Feature with an onDeny factory", () => {
      it("Then the consumer's custom exception surfaces at the wire", async () => {
        await request(app.getHttpServer())
          .get("/on-deny/disabled")
          .expect(FORBIDDEN)
          .expect((res) => {
            expect(res.body.message).toBe("Feature disabled")
          })
      })
    })

    describe("Given an onDeny factory that reads request headers", () => {
      it("Then the value from the live Request is reflected in the response body", async () => {
        const testId = "test-id-123-abc"
        await request(app.getHttpServer())
          .get("/on-deny/disabled-with-header")
          .set("x-test-id", testId)
          .expect(FORBIDDEN)
          .expect((res) => {
            expect(res.body.requestId).toBe(testId)
          })
      })
    })

    describe("Given a fail-closed @Feature (flag absent) with an onDeny factory", () => {
      it("Then the consumer's custom error surfaces with the distinctive 418 status", async () => {
        await request(app.getHttpServer())
          .get("/on-deny/fail-closed")
          .expect(I_AM_A_TEAPOT)
          .expect((res) => {
            expect(res.body.message).toBe("I'm a teapot — feature absent")
          })
      })
    })

    describe("Given an enabled @Feature with an onDeny factory", () => {
      it("Then the route admits with 200 and onDeny is never observed", async () => {
        await request(app.getHttpServer())
          .get("/on-deny/enabled")
          .expect(OK)
          .expect((res) => {
            expect(res.text).toBe("admitted")
          })
      })
    })

    describe("Given a route without any @Feature decorator", () => {
      it("Then it responds 204 (onDeny never observed on ungated routes)", async () => {
        await request(app.getHttpServer())
          .get("/on-deny/ungated")
          .expect(NO_CONTENT)
      })
    })

    describe("Given a class-level @Feature with onDeny and a handler-level @Feature without options", () => {
      it("Then handler-level fully overrides — deny falls back to NotFoundException (404)", async () => {
        await request(app.getHttpServer())
          .get("/on-deny-class/handler-plain")
          .expect(NOT_FOUND)
      })
    })
  })
})
