import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const httpErrorStatuses = [
  HttpStatus.BAD_REQUEST,
  HttpStatus.NOT_FOUND,
  HttpStatus.UNPROCESSABLE_ENTITY,
  HttpStatus.INTERNAL_SERVER_ERROR,
  HttpStatus.SERVICE_UNAVAILABLE,
]

describe("Identical Error Responses", () => {
  const message = faker.hacker.phrase()
  let nestJsApp: Awaited<ReturnType<typeof managedAppInstance>>
  let customApp: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    nestJsApp = await managedAppInstance("e2e/app/app.module.ts#AppModule")
    customApp = await managedAppInstance(
      "e2e/app/exception.module.ts#ExceptionModule",
    )
  })

  httpErrorStatuses.forEach((status) => {
    it(`should mirror the standard NestJS Exception handling of an HTTP ${status}`, async () => {
      const res = await request(nestJsApp.getHttpServer())
        .get("/error")
        .query({ status, message })
        .expect(status)

      await request(customApp.getHttpServer())
        .get("/error")
        .query({ status, message })
        .expect(status)
        .expect(res.body as object)
    })
  })

  it("should handle non-HTTP exceptions identically to NestJS", async () => {
    await request(nestJsApp.getHttpServer())
      .get("/error")
      .query({ status: -1, message })
      .expect(HttpStatus.INTERNAL_SERVER_ERROR)

    await request(customApp.getHttpServer())
      .get("/error")
      .query({ status: -1, message })
      .expect(HttpStatus.INTERNAL_SERVER_ERROR)
      .expect({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
        error: "Internal Server Error",
      })
  })
})
