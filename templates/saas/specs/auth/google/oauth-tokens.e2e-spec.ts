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

describe("OAuth token persistence (Google)", () => {
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

  const findAccountByEmail = async (email: string): Promise<Account | null> => {
    const repo = app.get(DataSource).getRepository(Account)
    return repo.findOneBy({ email: email.toLowerCase() })
  }

  const findTokensFor = async (
    accountId: string,
    provider: string,
  ): Promise<OAuthToken[]> => {
    const repo = app.get(DataSource).getRepository(OAuthToken)
    return repo.find({ where: { principal: { id: accountId }, provider } })
  }

  describe("Given a first Google sign-in", () => {
    it("should insert an OAuthToken row linked to the account with the access token, refresh token, expiresAt, and scopes", async () => {
      const code = google.code()
      const email = faker.internet.email().toLowerCase()
      const refreshToken = faker.string.alphanumeric(40)

      const response = await googleOAuth.mockCodeExchange({
        code,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri,
        idToken: google.idToken({ email }),
        refreshToken,
      })

      const before = Date.now()
      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .query({ code })
        .expect(FOUND)
      const after = Date.now()

      const account = await findAccountByEmail(email)
      expect(account).not.toBeNull()

      const tokens = await findTokensFor(account!.id, "google")
      expect(tokens).toHaveLength(1)

      const stored = tokens[0]
      expect(stored.provider).toBe("google")
      expect(stored.accessToken).toBe(response.access_token)
      expect(stored.refreshToken).toBe(refreshToken)
      expect(stored.scopes).toEqual(response.scope.split(" "))

      const expiresAt = new Date(stored.expiresAt).getTime()
      expect(expiresAt).toBeGreaterThanOrEqual(
        before + response.expires_in * 1000 - 2000,
      )
      expect(expiresAt).toBeLessThanOrEqual(
        after + response.expires_in * 1000 + 2000,
      )
    })
  })

  describe("Given a second Google sign-in where the response omits refresh_token", () => {
    it("should overwrite the access token in place and preserve the original refresh token", async () => {
      const email = faker.internet.email().toLowerCase()
      const originalRefreshToken = faker.string.alphanumeric(40)

      const firstCode = google.code()
      await googleOAuth.mockCodeExchange({
        code: firstCode,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri,
        idToken: google.idToken({ email }),
        refreshToken: originalRefreshToken,
      })
      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .query({ code: firstCode })
        .expect(FOUND)

      const secondCode = google.code()
      const secondResponse = await googleOAuth.mockCodeExchange({
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

      const account = await findAccountByEmail(email)
      const tokens = await findTokensFor(account!.id, "google")
      expect(tokens).toHaveLength(1)
      expect(tokens[0].accessToken).toBe(secondResponse.access_token)
      expect(tokens[0].refreshToken).toBe(originalRefreshToken)
    })
  })

  describe("Given GET /api/oauth-tokens/google on a principal with an active token", () => {
    it("should return the snapshot (accessToken, expiresAt, scopes) without the refresh token", async () => {
      const email = faker.internet.email().toLowerCase()

      // Seed via the Google callback so the production code path writes
      // the OAuthToken row through the same transaction the unit tests
      // already exercise.
      const code = google.code()
      const seedResponse = await googleOAuth.mockCodeExchange({
        code,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri,
        idToken: google.idToken({ email }),
        refreshToken: faker.string.alphanumeric(40),
      })
      await request(app.getHttpServer())
        .get("/auth/google/callback")
        .query({ code })
        .expect(FOUND)

      const cookie = await authenticate(app, email)

      const res = await request(app.getHttpServer())
        .get("/api/oauth-tokens/google")
        .set("Cookie", cookie)
        .expect(OK)

      const body = res.body as {
        token: {
          accessToken: string
          expiresAt: string
          scopes: string[]
        } | null
      }
      expect(body.token).not.toBeNull()
      expect(body.token!.accessToken).toBe(seedResponse.access_token)
      expect(body.token!.scopes).toEqual(seedResponse.scope.split(" "))
      expect(body.token).not.toHaveProperty("refreshToken")
      expect(new Date(body.token!.expiresAt).getTime()).toBeGreaterThan(
        Date.now(),
      )
    })
  })

  describe("Given GET /api/oauth-tokens/google on a principal whose stored token has expired", () => {
    it("should return token: null", async () => {
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
        .get("/api/oauth-tokens/google")
        .set("Cookie", cookie)
        .expect(OK)

      const body = res.body as { token: unknown }
      expect(body.token).toBeNull()
    })
  })
})
