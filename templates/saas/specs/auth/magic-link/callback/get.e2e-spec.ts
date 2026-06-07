import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import * as jwt from "jsonwebtoken"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { mailpit } from "~fixtures/email/mailpit"

const { FOUND, SEE_OTHER } = HttpStatus

/**
 * Extracts the callback URL from the magic link email HTML.
 */
function extractCallbackUrl(message: { HTML: string }): URL {
  const href = message.HTML.match(/href="([^"]*callback[^"]*)"/)?.[1]
  if (!href) {
    throw new Error("No callback URL found in email HTML")
  }
  return new URL(href)
}

/** Regex matching a valid session cookie in a Set-Cookie header. */
const SESSION_COOKIE_REGEX = /auth\.sid=.+; Max-Age=\d+; Path=\/; HttpOnly; SameSite=Lax/

describe("GET /auth/magic-link/callback", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("When a request is made with a valid token for a new email address", () => {
    const email = faker.internet.email()

    it(`should respond with an HTTP ${FOUND} redirect to / and set a session cookie`, async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email })

      const message = await mailpit.findByRecipient(email)
      const token = extractCallbackUrl(message).searchParams.get("token")

      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .query({ token })
        .expect(FOUND)
        .expect("Location", "/")
        .expect("Set-Cookie", SESSION_COOKIE_REGEX)
    })
  })

  describe("When a request is made with an expired token", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to /auth/register`, async () => {
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
        .expect("Location", "/auth/register")
    })
  })

  describe("When a request is made with an invalid signature", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to /auth/register`, async () => {
      const token = jwt.sign(
        { email: faker.internet.email(), aud: "magic-link" },
        "wrong-secret",
        { expiresIn: "15m" },
      )

      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .set("Accept", "text/html")
        .query({ token })
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
    })
  })

  describe("When a request is made with a malformed token", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to /auth/register`, async () => {
      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .set("Accept", "text/html")
        .query({ token: "not-a-valid-jwt" })
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
    })
  })
})
