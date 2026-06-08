import { readFileSync } from "fs"
import { join } from "path"

import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import * as jwt from "jsonwebtoken"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { mailpit } from "~fixtures/email/mailpit"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { FOUND, UNAUTHORIZED } = HttpStatus

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
const SESSION_COOKIE_REGEX =
  /auth\.sid=.+; Max-Age=\d+; Path=\/; HttpOnly; SameSite=Lax/

const expiredTemplate = readFileSync(
  join(process.cwd(), "views", "auth", "magic-link", "expired.ejs"),
  "utf-8",
)

describe("GET /auth/magic-link/callback", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("When a request is made with a valid token for a new email address", () => {
    const email = faker.internet.email()

    it(`should respond with an HTTP ${FOUND} redirect to /dashboard and set a session cookie`, async () => {
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

  describe("When a request is made with an expired token", () => {
    it(`should respond with HTTP ${UNAUTHORIZED} and the expired template`, async () => {
      const token = jwt.sign(
        { email: faker.internet.email(), aud: "magic-link" },
        process.env.JWT_SECRET!,
        { expiresIn: -10 },
      )

      const expectedHtml = ejs.render(expiredTemplate, {
        npmPackageName,
        npmPackageVersion,
      })

      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .set("Accept", "text/html")
        .query({ token })
        .expect(UNAUTHORIZED)
        .expect(expectedHtml)
    })
  })

  describe("When a request is made with an invalid signature", () => {
    it(`should respond with HTTP ${UNAUTHORIZED} and the expired template`, async () => {
      const token = jwt.sign(
        { email: faker.internet.email(), aud: "magic-link" },
        "wrong-secret",
        { expiresIn: "15m" },
      )

      const expectedHtml = ejs.render(expiredTemplate, {
        npmPackageName,
        npmPackageVersion,
      })

      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .set("Accept", "text/html")
        .query({ token })
        .expect(UNAUTHORIZED)
        .expect(expectedHtml)
    })
  })

  describe("When a request is made with a malformed token", () => {
    it(`should respond with HTTP ${UNAUTHORIZED} and the expired template`, async () => {
      const expectedHtml = ejs.render(expiredTemplate, {
        npmPackageName,
        npmPackageVersion,
      })

      await request(app.getHttpServer())
        .get("/auth/magic-link/callback")
        .set("Accept", "text/html")
        .query({ token: "not-a-valid-jwt" })
        .expect(UNAUTHORIZED)
        .expect(expectedHtml)
    })
  })
})
