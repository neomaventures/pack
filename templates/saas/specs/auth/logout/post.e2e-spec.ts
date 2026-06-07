import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"
import { managedAppInstance } from "@neomaventures/managed-app"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { mailpit } from "~fixtures/email/mailpit"

const { FOUND, SEE_OTHER } = HttpStatus

/** Regex matching a valid session cookie in a Set-Cookie header. */
const SESSION_COOKIE_REGEX = /auth\.sid=.+; Max-Age=\d+; Path=\/; HttpOnly; SameSite=Lax/

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

describe("POST /auth/logout", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("When a request is made with a valid session cookie", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to / and clear the session cookie`, async () => {
      const email = faker.internet.email()

      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email })

      const message = await mailpit.findByRecipient(email)
      const token = extractCallbackUrl(message).searchParams.get("token")

      const verifyResponse = await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .query({ token })
        .expect(FOUND)
        .expect("Set-Cookie", SESSION_COOKIE_REGEX)

      await request(app.getHttpServer())
        .post("/auth/logout")
        .set("Cookie", verifyResponse.headers["set-cookie"]!)
        .expect(SEE_OTHER)
        .expect("Location", "/")
        .expect("Set-Cookie", /auth\.sid=; Max-Age=0/)
    })
  })

  describe("When a request is made without a session cookie", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to /`, () => {
      return request(app.getHttpServer())
        .post("/auth/logout")
        .expect(SEE_OTHER)
        .expect("Location", "/")
    })
  })
})
