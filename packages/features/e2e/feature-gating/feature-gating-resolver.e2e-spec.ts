import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { OK, NOT_FOUND } = HttpStatus

describe("Feature gating (resolver only)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance(
      "e2e/app/app.resolver.module.ts#ResolverAppModule",
    )
  })

  describe("Given a route gated by @Feature('RESOLVER_ENABLED')", () => {
    describe("And the request includes the enabling x-features header", () => {
      it("Then it should respond with a 200", async () => {
        const server = app.getHttpServer()
        await request(server)
          .get("/resolver-only")
          .set("x-features", "RESOLVER_ENABLED")
          .expect(OK)
      })
    })

    describe("And the request omits the x-features header", () => {
      it("Then it should respond with a 404 (flag absent from resolved map)", async () => {
        const server = app.getHttpServer()
        await request(server).get("/resolver-only").expect(NOT_FOUND)
      })
    })
  })

  describe("Given a route gated by @Feature('UNKNOWN_FEATURE')", () => {
    describe("And neither the flags nor the resolver report it", () => {
      it("Then it should respond with a 404", async () => {
        const server = app.getHttpServer()
        await request(server)
          .get("/resolver-denied")
          .set("x-features", "RESOLVER_ENABLED")
          .expect(NOT_FOUND)
      })
    })
  })
})

describe("Feature gating (static + resolver union)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("e2e/app/app.union.module.ts#UnionAppModule")
  })

  describe("Given a route gated by @Feature('ENABLED_FEATURE')", () => {
    describe("And flags set it to true while the resolver reports it false", () => {
      it("Then static true wins and it responds with a 200 (no header)", async () => {
        const server = app.getHttpServer()
        await request(server).get("/enabled").expect(OK)
      })

      it("Then static true wins even when the header is present", async () => {
        const server = app.getHttpServer()
        await request(server)
          .get("/enabled")
          .set("x-features", "RESOLVER_ENABLED")
          .expect(OK)
      })
    })
  })

  describe("Given a route gated by @Feature('RESOLVER_ENABLED')", () => {
    describe("And the resolver admits because of the enabling header", () => {
      it("Then the union admits and it responds with a 200", async () => {
        const server = app.getHttpServer()
        await request(server)
          .get("/resolver-only")
          .set("x-features", "RESOLVER_ENABLED")
          .expect(OK)
      })
    })

    describe("And the header is absent", () => {
      it("Then neither source admits and it responds with a 404", async () => {
        const server = app.getHttpServer()
        await request(server).get("/resolver-only").expect(NOT_FOUND)
      })
    })
  })
})
