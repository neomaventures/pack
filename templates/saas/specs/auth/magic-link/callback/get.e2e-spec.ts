import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import * as jwt from "jsonwebtoken"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import {
  extractCallbackUrl,
  SESSION_COOKIE_REGEX,
} from "~fixtures/email/content"
import { mailpit } from "~fixtures/email/mailpit"

const { FOUND, SEE_OTHER } = HttpStatus

describe("GET /auth/magic-link/callback", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("Given a valid token for a new email address", () => {
    const email = faker.internet.email()

    it(`should redirect to /dashboard and set a session cookie`, async () => {
      await request(app.getHttpServer()).post("/auth/register").send({ email })

      const message = await mailpit.findByRecipient(email)
      const token = extractCallbackUrl(message).searchParams.get("token")

      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .query({ token })
        .expect(FOUND)
        .expect("Location", "/dashboard")
        .expect("Set-Cookie", SESSION_COOKIE_REGEX)
    })
  })

  describe("Given an expired token", () => {
    it(`should redirect to /auth/magic-link/expired`, async () => {
      const token = jwt.sign(
        { email: faker.internet.email(), aud: "magic-link" },
        process.env.JWT_SECRET!,
        { expiresIn: -10 },
      )

      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .set("Accept", "text/html")
        .query({ token })
        .expect(SEE_OTHER)
        .expect("Location", "/auth/magic-link/expired")
    })
  })

  describe("Given an invalid signature", () => {
    it(`should redirect to /auth/magic-link/expired`, async () => {
      const token = jwt.sign(
        { email: faker.internet.email(), aud: "magic-link" },
        faker.hacker.ingverb(),
        { expiresIn: "15m" },
      )

      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .set("Accept", "text/html")
        .query({ token })
        .expect(SEE_OTHER)
        .expect("Location", "/auth/magic-link/expired")
    })
  })

  describe("Given a malformed token", () => {
    it(`should redirect to /auth/magic-link/expired`, async () => {
      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .set("Accept", "text/html")
        .query({ token: "not-a-valid-jwt" })
        .expect(SEE_OTHER)
        .expect("Location", "/auth/magic-link/expired")
    })
  })
})
