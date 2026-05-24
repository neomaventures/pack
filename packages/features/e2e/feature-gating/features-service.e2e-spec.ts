import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { OK, NOT_FOUND } = HttpStatus

describe("FeaturesService.isEnabled in a live handler (forRoot, static flags)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("e2e/app/app.module.ts#AppModule")
  })

  describe("Given DOCUMENT_AI_SUMMARY is true in static flags", () => {
    describe("When POST /documents is called", () => {
      it("Then isEnabled returns true and the handler admits (200)", async () => {
        await request(app.getHttpServer()).post("/documents").expect(OK)
      })
    })
  })

  describe("Given a flag NEVER_ENABLED absent from both flags and resolver", () => {
    describe("When POST /documents/never is called", () => {
      it("Then isEnabled returns false and the handler throws 404", async () => {
        await request(app.getHttpServer())
          .post("/documents/never")
          .expect(NOT_FOUND)
      })
    })
  })

  describe("Parity with @Feature-gated sibling route", () => {
    describe("Given DOCUMENT_AI_SUMMARY is true in static flags", () => {
      it("Then GET /documents/ai-only admits (200) matching isEnabled=true", async () => {
        await request(app.getHttpServer()).get("/documents/ai-only").expect(OK)
      })
    })

    describe("Given NEVER_ENABLED is absent", () => {
      it("Then GET /documents/never denies (404) matching isEnabled=false", async () => {
        await request(app.getHttpServer())
          .get("/documents/never")
          .expect(NOT_FOUND)
      })
    })
  })
})

describe("FeaturesService.isEnabled in a live handler (forRootAsync, resolver)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("e2e/app/app.async.module.ts#AsyncAppModule")
  })

  describe("Given the resolver admits DOCUMENT_AI_SUMMARY when the x-ai-summary header is true", () => {
    describe("When POST /documents is called with the header set", () => {
      it("Then isEnabled returns true and the handler admits (200)", async () => {
        await request(app.getHttpServer())
          .post("/documents")
          .set("x-ai-summary", "true")
          .expect(OK)
      })
    })

    describe("When POST /documents is called without the header", () => {
      it("Then isEnabled returns false and the handler throws 404", async () => {
        await request(app.getHttpServer()).post("/documents").expect(NOT_FOUND)
      })
    })
  })

  describe("Parity with @Feature-gated sibling route", () => {
    describe("Given the resolver admits DOCUMENT_AI_SUMMARY because the header is set", () => {
      it("Then GET /documents/ai-only admits (200) matching isEnabled=true", async () => {
        await request(app.getHttpServer())
          .get("/documents/ai-only")
          .set("x-ai-summary", "true")
          .expect(OK)
      })
    })

    describe("Given the header is absent so the resolver reports DOCUMENT_AI_SUMMARY=false", () => {
      it("Then GET /documents/ai-only denies (404) matching isEnabled=false", async () => {
        await request(app.getHttpServer())
          .get("/documents/ai-only")
          .expect(NOT_FOUND)
      })
    })
  })
})
