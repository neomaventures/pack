import { faker } from "@faker-js/faker"
import { SESSION_AUDIENCE } from "@neoma/auth"
import { managedAppInstance } from "@neoma/managed-app"
import { MockServerClient } from "@neoma/mockserver"
import { HttpStatus } from "@nestjs/common"
import { google } from "fixtures/fakes/google"
import { authenticateViaEmail } from "fixtures/fakes/magic-link"
import {
  mockCodeExchangeApi,
  mockCodeExchangeApiHttpError,
  mockCodeExchangeApiNetworkError,
} from "fixtures/google/oauth-api"
import * as jwt from "jsonwebtoken"
import request from "supertest"
import { DataSource } from "typeorm"

const { OK, UNAUTHORIZED, FORBIDDEN, BAD_GATEWAY } = HttpStatus

const appModules: [string, string][] = [
  ["forRoot", "e2e/app/core/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/core/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`GET /auth/google/callback (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>
    let datasource: DataSource
    let mockServerClient: MockServerClient

    beforeEach(async () => {
      mockServerClient = new MockServerClient(process.env.MOCKSERVER_URL!)
      app = await managedAppInstance(modulePath)
      datasource = app.get(DataSource)
    })

    afterEach(async () => {
      await mockServerClient.reset()
    })

    describe("When called with a valid code for a new email", () => {
      const emailCases = [
        { desc: "lowercase", email: faker.internet.email().toLowerCase() },
        { desc: "UPPERCASE", email: faker.internet.email().toUpperCase() },
        { desc: "MiXeD CaSe", email: "TeSt.UsEr@ExAmPlE.cOm" },
      ]

      emailCases.forEach(({ desc, email }) => {
        describe(`with ${desc} email: ${email}`, () => {
          it("should respond with HTTP 200, normalized email, isNewUser: true, and a valid session token", async () => {
            const code = google.code()
            const sub = google.sub()
            const googleName = faker.person.fullName()

            await mockCodeExchangeApi(code, {
              id_token: google.idToken({ email, sub, name: googleName }),
            })

            const response = await request(app.getHttpServer())
              .get("/auth/google/callback")
              .query({ code })
              .expect(OK)

            expect(response.body).toMatchObject({
              user: {
                email: email.toLowerCase(),
              },
              isNewUser: true,
            })
            expect(response.body.user.id).toBeDefined()
            expect(response.body.token).toBeDefined()

            // Verify the session token is valid and has correct audience
            const payload = jwt.verify(
              response.body.token as string,
              process.env.GARMR_SECRET!,
            ) as jwt.JwtPayload
            expect(payload).toMatchObject({
              sub: response.body.user.id,
              aud: SESSION_AUDIENCE,
            })
          })
        })
      })
    })

    describe("When called with a valid code for an existing email", () => {
      it("should respond with HTTP 200 and return the existing user with isNewUser: false", async () => {
        const email = faker.internet.email().toLowerCase()

        // Create user first
        const repo = datasource.getRepository("User")
        const existingUser = repo.create({ email })
        await repo.save(existingUser)

        const code = google.code()
        await mockCodeExchangeApi(code, {
          id_token: google.idToken({ email }),
        })

        const response = await request(app.getHttpServer())
          .get("/auth/google/callback")
          .query({ code })
          .expect(OK)

        expect(response.body).toMatchObject({
          user: {
            id: (existingUser as any).id,
            email,
          },
          isNewUser: false,
        })
      })

      it("should find existing user with case-insensitive email lookup", async () => {
        const email = "existing@example.com"

        const repo = datasource.getRepository("User")
        const existingUser = repo.create({ email })
        await repo.save(existingUser)

        const code = google.code()
        // Google returns UPPERCASE email
        await mockCodeExchangeApi(code, {
          id_token: google.idToken({ email: "EXISTING@EXAMPLE.COM" }),
        })

        const response = await request(app.getHttpServer())
          .get("/auth/google/callback")
          .query({ code })
          .expect(OK)

        expect(response.body).toMatchObject({
          user: {
            id: (existingUser as any).id,
          },
          isNewUser: false,
        })
      })
    })

    describe("When Google returns a 4xx HTTP error (invalid code)", () => {
      it("should respond with HTTP 401", async () => {
        const code = google.code()
        await mockCodeExchangeApiHttpError(code, { statusCode: 400 })

        const response = await request(app.getHttpServer())
          .get("/auth/google/callback")
          .query({ code })
          .expect(UNAUTHORIZED)

        expect(response.body).toMatchObject({
          statusCode: UNAUTHORIZED,
          error: "Unauthorized",
        })
        expect(response.body.message).toContain("Google authentication failed")
        expect(response.body.reason).toBeDefined()
      })
    })

    describe("When Google returns a 5xx HTTP error", () => {
      it("should respond with HTTP 502", async () => {
        const code = google.code()
        await mockCodeExchangeApiHttpError(code, { statusCode: 500 })

        const response = await request(app.getHttpServer())
          .get("/auth/google/callback")
          .query({ code })
          .expect(BAD_GATEWAY)

        expect(response.body).toMatchObject({
          statusCode: BAD_GATEWAY,
          error: "Bad Gateway",
        })
        expect(response.body.message).toContain("Google service error")
        expect(response.body.reason).toBeDefined()
      })
    })

    describe("When Google returns a network error", () => {
      it("should respond with HTTP 502", async () => {
        const code = google.code()
        await mockCodeExchangeApiNetworkError(code)

        await request(app.getHttpServer())
          .get("/auth/google/callback")
          .query({ code })
          .expect(BAD_GATEWAY)
      })
    })

    describe("When called without a code query parameter", () => {
      it("should respond with HTTP 401 with reason 'missing code query parameter'", async () => {
        const response = await request(app.getHttpServer())
          .get("/auth/google/callback")
          .expect(UNAUTHORIZED)

        expect(response.body).toMatchObject({
          statusCode: UNAUTHORIZED,
          message: "Google authentication failed: missing code query parameter",
          reason: "missing code query parameter",
          error: "Unauthorized",
        })
      })
    })

    describe("When the Google ID token is missing the sub claim", () => {
      it("should respond with HTTP 401", async () => {
        const code = google.code()
        const secret = faker.string.alphanumeric(32)
        const idTokenWithoutSub = jwt.sign(
          {
            iss: "https://accounts.google.com",
            aud: google.aud(),
            email: faker.internet.email(),
            name: faker.person.fullName(),
          },
          secret,
        )

        await mockCodeExchangeApi(code, { id_token: idTokenWithoutSub })

        const response = await request(app.getHttpServer())
          .get("/auth/google/callback")
          .query({ code })
          .expect(UNAUTHORIZED)

        expect(response.body).toMatchObject({
          statusCode: UNAUTHORIZED,
          message: "Google ID token error: missing sub in ID token",
          reason: "missing sub in ID token",
          error: "Unauthorized",
        })
      })
    })

    describe("When the ID token is missing the email claim", () => {
      it("should respond with HTTP 401 with reason 'missing email in ID token'", async () => {
        const code = google.code()
        // Create an ID token with no email claim
        const secret = faker.string.alphanumeric(32)
        const idTokenWithoutEmail = jwt.sign(
          {
            iss: "https://accounts.google.com",
            sub: google.sub(),
            aud: google.aud(),
            name: faker.person.fullName(),
          },
          secret,
        )

        await mockCodeExchangeApi(code, { id_token: idTokenWithoutEmail })

        const response = await request(app.getHttpServer())
          .get("/auth/google/callback")
          .query({ code })
          .expect(UNAUTHORIZED)

        expect(response.body).toMatchObject({
          statusCode: UNAUTHORIZED,
          message: "Google ID token error: missing email in ID token",
          reason: "missing email in ID token",
          error: "Unauthorized",
        })
      })
    })

    describe("When the Google ID token has email_verified: false", () => {
      it("should respond with HTTP 403", async () => {
        const email = faker.internet.email()
        const code = google.code()

        await mockCodeExchangeApi(code, {
          id_token: google.idToken({ email, email_verified: false }),
        })

        const response = await request(app.getHttpServer())
          .get("/auth/google/callback")
          .query({ code })
          .expect(FORBIDDEN)

        expect(response.body).toMatchObject({
          statusCode: FORBIDDEN,
          email,
          error: "Forbidden",
        })
        expect(response.body.message).toContain("has not been verified")
      })
    })

    describe("Account linking", () => {
      describe("When a user authenticates with Google, then authenticates with magic link using the same email", () => {
        it("should return the same user and preserve Google profile data", async () => {
          const email = faker.internet.email().toLowerCase()
          const googleSub = google.sub()
          const googleName = faker.person.fullName()

          // Step 1: Authenticate via Google
          const code = google.code()
          await mockCodeExchangeApi(code, {
            id_token: google.idToken({
              email,
              sub: googleSub,
              name: googleName,
            }),
          })

          const googleResponse = await request(app.getHttpServer())
            .get("/auth/google/callback")
            .query({ code })
            .expect(OK)

          const googleUserId = googleResponse.body.user.id
          expect(googleResponse.body.isNewUser).toBe(true)

          // Step 2: Authenticate via magic link with the same email
          const magicLinkResult = await authenticateViaEmail(app, email)

          // Step 3: Verify it is the same user
          expect(magicLinkResult.user.id).toBe(googleUserId)

          // Step 4: Verify Google profile data persists
          const meResponse = await request(app.getHttpServer())
            .get("/me")
            .set("Authorization", `Bearer ${magicLinkResult.token}`)
            .expect(OK)

          expect(meResponse.body.id).toBe(googleUserId)

          // Verify the profile data in the database
          const repo = datasource.getRepository("User")
          const user = await repo.findOne({
            where: { email },
          })
          expect((user as any).authProfile).toMatchObject({
            google: {
              sub: googleSub,
              name: googleName,
            },
          })
        })
      })

      describe("When a user authenticates with magic link, then authenticates with Google using the same email", () => {
        it("should return the same user and write Google profile data", async () => {
          const email = faker.internet.email().toLowerCase()
          const googleSub = google.sub()
          const googleName = faker.person.fullName()

          // Step 1: Authenticate via magic link first
          const magicLinkResult = await authenticateViaEmail(app, email)
          const magicLinkUserId = magicLinkResult.user.id

          // Step 2: Authenticate via Google with the same email
          const code = google.code()
          await mockCodeExchangeApi(code, {
            id_token: google.idToken({
              email,
              sub: googleSub,
              name: googleName,
            }),
          })

          const googleResponse = await request(app.getHttpServer())
            .get("/auth/google/callback")
            .query({ code })
            .expect(OK)

          // Step 3: Verify it is the same user
          expect(googleResponse.body.user.id).toBe(magicLinkUserId)
          expect(googleResponse.body.isNewUser).toBe(false)

          // Step 4: Verify Google profile data was written
          const repo = datasource.getRepository("User")
          const user = await repo.findOne({
            where: { email },
          })
          expect((user as any).authProfile).toMatchObject({
            google: {
              sub: googleSub,
              name: googleName,
            },
          })
        })
      })
    })
  })
})
