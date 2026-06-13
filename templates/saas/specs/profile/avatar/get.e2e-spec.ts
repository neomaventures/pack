import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"

const { FOUND, OK, UNAUTHORIZED } = HttpStatus

describe("GET /profile/avatar", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("When an authenticated request is made and no avatar is set", () => {
    const email = faker.internet.email()

    it(`should respond with HTTP ${FOUND} redirecting to the default avatar`, async () => {
      const cookie = await authenticate(app, email)

      await request(app.getHttpServer())
        .get("/profile/avatar")
        .set("Cookie", cookie)
        .expect(FOUND)
        .expect("Location", "/img/default-avatar.svg")
    })
  })

  describe("When an unauthenticated request is made", () => {
    it(`should respond with HTTP ${UNAUTHORIZED}`, () => {
      return request(app.getHttpServer())
        .get("/profile/avatar")
        .expect(UNAUTHORIZED)
    })
  })

  describe("When the default avatar asset is requested without auth", () => {
    it(`should respond with HTTP ${OK} and image/svg+xml`, () => {
      return request(app.getHttpServer())
        .get("/img/default-avatar.svg")
        .expect(OK)
        .expect("Content-Type", /image\/svg\+xml/)
    })
  })
})
