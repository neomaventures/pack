import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"

const { FOUND, NOT_FOUND } = HttpStatus

const tinyPngBuffer = (): Buffer =>
  Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4" +
      "890000000d49444154789c626001000000050001a7c66ec00000000049454e44ae426082",
    "hex",
  )

describe("GET /profile/avatar", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({ configure: configureViewEngine })
  })

  describe("When an authenticated user has not uploaded an avatar", () => {
    it(`should redirect to the default avatar image`, async () => {
      const cookie = await authenticate(app, faker.internet.email())

      await request(app.getHttpServer())
        .get("/profile/avatar")
        .set("Cookie", cookie)
        .expect(FOUND)
        .expect("Location", "/img/default-avatar.svg")
    })
  })

  describe("When an authenticated user has uploaded an avatar", () => {
    it("should redirect to a presigned S3 URL", async () => {
      const cookie = await authenticate(app, faker.internet.email())

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", tinyPngBuffer(), {
          filename: "avatar.png",
          contentType: "image/png",
        })
        .expect(FOUND)

      const response = await request(app.getHttpServer())
        .get("/profile/avatar")
        .set("Cookie", cookie)
        .expect(FOUND)

      expect(response.headers.location).not.toBe("/img/default-avatar.svg")
      expect(response.headers.location).toMatch(/^https?:\/\//)
    })
  })

  describe("When the request is not authenticated", () => {
    it("should respond with 404 — asset endpoints do not confirm resource existence", () => {
      return request(app.getHttpServer())
        .get("/profile/avatar")
        .expect(NOT_FOUND)
    })
  })
})
