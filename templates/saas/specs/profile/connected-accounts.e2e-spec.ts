import { faker } from "@faker-js/faker"
import { google, GoogleOAuthClient } from "@neomaventures/google-fixtures"
import { managedAppInstance } from "@neomaventures/managed-app"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { DataSource } from "typeorm"

import { Account } from "~auth/account.entity"
import { OAuthToken } from "~auth/oauth-token.entity"
import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"

const { FOUND, OK } = HttpStatus

describe("GET /profile - connected accounts section", () => {
  const { APP_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } =
    process.env as Record<string, string>
  const redirectUri = `${APP_URL}/auth/google/callback`
  const googleOAuth = new GoogleOAuthClient(mockserver)
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("Given a user has just signed in with Google for the first time", () => {
    it("should render the profile page with the Google account listed as active including scopes and expiry", async () => {
      const code = google.code()
      const email = faker.internet.email().toLowerCase()
      const refreshToken = faker.string.alphanumeric(40)

      const tokenResponse = await googleOAuth.mockCodeExchange({
        code,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri,
        idToken: google.idToken({ email }),
        refreshToken,
      })

      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .query({ code })
        .expect(FOUND)

      const cookie = await authenticate(app, email)

      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      const html = res.text
      expect(html).toContain('data-provider="google"')
      expect(html).toContain(">google<")
      expect(html).toContain("Active")
      tokenResponse.scope.split(" ").forEach((scope) => {
        expect(html).toContain(scope)
      })
      // Some indication of expiresAt — the template emits an ISO timestamp.
      expect(html).toMatch(/Expires:[\s\S]*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
      // Tokens themselves must never appear in the rendered HTML.
      expect(html).not.toContain(tokenResponse.access_token)
      expect(html).not.toContain(refreshToken)
    })
  })

  describe("Given a user whose stored Google token has expired", () => {
    it("should render the profile page with the Google account marked Expired (not Active)", async () => {
      const email = faker.internet.email().toLowerCase()

      const datasource = app.get(DataSource)
      const accounts = datasource.getRepository(Account)
      const tokens = datasource.getRepository(OAuthToken)

      const account = await accounts.save(
        accounts.create({ email, permissions: [] }),
      )
      await tokens.save(
        tokens.create({
          principal: account,
          provider: "google",
          accessToken: faker.string.alphanumeric(40),
          refreshToken: faker.string.alphanumeric(40),
          expiresAt: new Date(Date.now() - 60 * 1000),
          scopes: ["openid", "email", "profile"],
        }),
      )

      const cookie = await authenticate(app, email)

      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      const html = res.text
      expect(html).toContain('data-provider="google"')
      expect(html).toContain("Expired")
      expect(html).not.toMatch(/<span[^>]*>\s*Active\s*<\/span>/)
    })
  })
})
