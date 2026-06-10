import { faker } from "@faker-js/faker"
import { google, GoogleOAuthClient } from "@neomaventures/google-fixtures"
import { managedAppInstance } from "@neomaventures/managed-app"
import { MockServerClient } from "@neomaventures/mockserver"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { SESSION_COOKIE_REGEX } from "~fixtures/email/content"

const { FOUND, SEE_OTHER } = HttpStatus

describe("GET /auth/google/callback", () => {
  const { APP_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MOCKSERVER_URL } =
    process.env as Record<string, string>
  const redirectUri = `${APP_URL}/auth/google/callback`
  const mockServerClient = new MockServerClient(MOCKSERVER_URL)
  const googleOAuth = new GoogleOAuthClient(mockServerClient)
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    await mockServerClient.reset()

    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("Given a valid code for a new user", () => {
    it("should redirect to /dashboard and set a session cookie", async () => {
      const code = google.code()
      const email = faker.internet.email().toLowerCase()

      await googleOAuth.mockCodeExchange({
        code,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri,
        idToken: google.idToken({ email }),
      })

      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .query({ code })
        .expect(FOUND)
        .expect("Location", "/dashboard")
        .expect("Set-Cookie", SESSION_COOKIE_REGEX)
    })
  })

  describe("Given a valid code for a returning user", () => {
    it("should redirect to /dashboard and set a session cookie", async () => {
      const email = faker.internet.email().toLowerCase()

      // First login — create the user
      const firstCode = google.code()
      await googleOAuth.mockCodeExchange({
        code: firstCode,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri,
        idToken: google.idToken({ email }),
      })

      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .query({ code: firstCode })
        .expect(FOUND)

      // Second login — same email
      const secondCode = google.code()
      await googleOAuth.mockCodeExchange({
        code: secondCode,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri,
        idToken: google.idToken({ email }),
      })

      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .query({ code: secondCode })
        .expect(FOUND)
        .expect("Location", "/dashboard")
        .expect("Set-Cookie", SESSION_COOKIE_REGEX)
    })
  })

  describe("Given the Google code exchange fails", () => {
    it("should redirect to /auth/register with no session cookie", async () => {
      const code = google.code()

      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .set("Accept", "text/html")
        .query({ code })
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
        .expect((res) => expect(res.get("Set-Cookie")).toBeUndefined())
    })
  })

  describe("Given Google returns an HTTP error", () => {
    it("should redirect to /auth/register with no session cookie", async () => {
      const code = google.code()

      await googleOAuth.mockCodeExchangeHttpError({
        code,
        statusCode: 400,
      })

      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .set("Accept", "text/html")
        .query({ code })
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
        .expect((res) => expect(res.get("Set-Cookie")).toBeUndefined())
    })
  })

  describe("Given Google returns a network error", () => {
    it("should redirect to /auth/register with no session cookie", async () => {
      const code = google.code()

      await googleOAuth.mockCodeExchangeNetworkError({ code })

      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .set("Accept", "text/html")
        .query({ code })
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
        .expect((res) => expect(res.get("Set-Cookie")).toBeUndefined())
    })
  })

  describe("Given no code query parameter", () => {
    it("should redirect to /auth/register with no session cookie", async () => {
      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .set("Accept", "text/html")
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
        .expect((res) => expect(res.get("Set-Cookie")).toBeUndefined())
    })
  })

  describe("Given Google returns an error query param (user denied consent)", () => {
    it("should redirect to /auth/register with no session cookie", async () => {
      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .query({ error: "access_denied" })
        .set("Accept", "text/html")
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
        .expect((res) => expect(res.get("Set-Cookie")).toBeUndefined())
    })
  })
})
