import { faker } from "@faker-js/faker"
import {
  google as googleFakes,
  GoogleOAuthClient,
} from "@neomaventures/google-fixtures"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { type DynamicModule } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm"
import { google } from "fixtures/fakes/google"
import * as jwt from "jsonwebtoken"
import { type Repository } from "typeorm"

import { AuthModule } from "../auth.module"
import { type AuthOptions } from "../auth.options"
import { Account } from "../entities/account.entity"
import { OAuthToken } from "../entities/oauth-token.entity"
import { AuthenticatedEvent } from "../events/authenticated.event"
import { RegisteredEvent } from "../events/registered.event"
import { EmailNotVerifiedException } from "../exceptions/email-not-verified.exception"
import { GoogleCodeExchangeException } from "../exceptions/google-code-exchange.exception"
import { GoogleNetworkException } from "../exceptions/google-network.exception"
import { GoogleServiceException } from "../exceptions/google-service.exception"
import { GoogleTokenException } from "../exceptions/google-token.exception"

import { GoogleAuthService } from "./google-auth.service"

const googleOAuthClient = new GoogleOAuthClient(mockserver)

const googleAuth = google.authOptions({
  tokenEndpoint: googleOAuthClient.tokenEndpoint(),
})

interface BuildModuleOptions {
  register: (opts: AuthOptions) => DynamicModule
  overrides?: Partial<AuthOptions>
}

async function buildModule({
  register,
  overrides,
}: BuildModuleOptions): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: "sqlite",
        database: ":memory:",
        entities: [Account, OAuthToken],
        synchronize: true,
      }),
      TypeOrmModule.forFeature([Account, OAuthToken]),
      register({
        secret: faker.internet.password(),
        expiresIn: "1h",
        googleAuth,
        ...overrides,
      } as AuthOptions),
    ],
  }).compile()
}

async function mockSuccess(
  code: string,
  options: { id_token?: string } = {},
): Promise<void> {
  await googleOAuthClient.mockCodeExchange({
    code,
    clientId: googleAuth.clientId,
    clientSecret: googleAuth.clientSecret,
    redirectUri: googleAuth.redirectUri,
    idToken: options.id_token,
    times: { unlimited: true },
  })
}

async function mockHttpError(
  code: string,
  options: { statusCode?: number } = {},
): Promise<void> {
  await googleOAuthClient.mockCodeExchangeHttpError({
    code,
    statusCode: options.statusCode,
    times: { unlimited: true },
  })
}

async function mockNetworkError(code: string): Promise<void> {
  await googleOAuthClient.mockCodeExchangeNetworkError({
    code,
    times: { unlimited: true },
  })
}

const registrations: [string, (opts: AuthOptions) => DynamicModule][] = [
  ["forRoot", (opts): DynamicModule => AuthModule.forRoot(opts)],
  [
    "forRootAsync",
    (opts): DynamicModule =>
      AuthModule.forRootAsync({ useFactory: (): AuthOptions => opts }),
  ],
]

registrations.forEach(([name, register]) => {
  describe(`GoogleAuthService (${name})`, () => {
    describe("authorizeUrl", () => {
      describe("Given Google OAuth is configured with default scopes", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should return the authorize URL with configured params and default scopes", () => {
          const expected = googleFakes.authorizeUrl(
            googleAuth.clientId,
            googleAuth.redirectUri,
            googleFakes.sensibleScopes(),
          )

          expect(service.authorizeUrl!.toString()).toBe(expected)
        })
      })

      describe("Given Google OAuth is configured with custom scopes", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({
            register,
            overrides: {
              googleAuth: {
                ...googleAuth,
                scopes: [
                  "openid",
                  "email",
                  "https://www.googleapis.com/auth/gmail.readonly",
                ],
              },
            },
          })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should return a URL with the custom scopes", () => {
          expect(service.authorizeUrl!.searchParams.get("scope")).toBe(
            "openid email https://www.googleapis.com/auth/gmail.readonly",
          )
        })
      })

      describe("Given Google OAuth is not configured", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({
            register,
            overrides: {
              googleAuth: undefined,
              magicLink: {
                mailer: {
                  host: "localhost",
                  port: 1025,
                  from: faker.internet.email(),
                  welcome: {
                    subject: "Welcome",
                    html: '<a href="{{token}}">Link</a>',
                  },
                  welcomeBack: {
                    subject: "Welcome back",
                    html: '<a href="{{token}}">Link</a>',
                  },
                },
              },
            } as Partial<AuthOptions>,
          })

          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should return null", () => {
          expect(service.authorizeUrl).toBeNull()
        })
      })
    })

    describe("authenticate", () => {
      describe("Given a valid code for a new email", () => {
        let service: GoogleAuthService
        let repository: Repository<Account>
        let eventEmitter: EventEmitter2

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
          repository = module.get<Repository<Account>>(
            getRepositoryToken(Account),
          )
          eventEmitter = module.get<EventEmitter2>(EventEmitter2)
        })

        it("should create a new Account entity", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({ email })
          await mockSuccess(code, { id_token: idToken })

          await service.authenticate(code)

          const accounts = await repository.find()
          expect(accounts).toHaveLength(1)
          expect(accounts[0].email).toBe(email.toLowerCase())
        })

        it("should return the new entity with isNewUser: true", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({ email })
          await mockSuccess(code, { id_token: idToken })

          const result = await service.authenticate(code)

          expect(result.entity).toBeInstanceOf(Account)
          expect(result.entity.email).toBe(email.toLowerCase())
          expect(result.isNewUser).toBe(true)
        })

        it("should emit a RegisteredEvent with provider 'google'", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({ email })
          await mockSuccess(code, { id_token: idToken })
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          const result = await service.authenticate(code)

          expect(emitSpy).toHaveBeenCalledWith(
            RegisteredEvent.EVENT_NAME,
            new RegisteredEvent(result.entity, "google"),
          )
        })

        it("should not emit a AuthenticatedEvent", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({ email })
          await mockSuccess(code, { id_token: idToken })
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          await service.authenticate(code)

          expect(emitSpy).not.toHaveBeenCalledWith(
            AuthenticatedEvent.EVENT_NAME,
            expect.anything(),
          )
        })

        it("should return the Google profile (sub, name, picture)", async () => {
          const code = faker.string.alphanumeric(20)
          const sub = faker.string.numeric(10)
          const googleName = faker.person.fullName()
          const picture = faker.image.avatar()
          const idToken = googleFakes.idToken({
            email: faker.internet.email(),
            sub,
            name: googleName,
            picture,
          })
          await mockSuccess(code, { id_token: idToken })

          const result = await service.authenticate(code)

          expect(result.profile).toEqual({ sub, name: googleName, picture })
        })

        it("should write Google profile data to entity.authProfile.google", async () => {
          const code = faker.string.alphanumeric(20)
          const sub = faker.string.numeric(10)
          const googleName = faker.person.fullName()
          const picture = faker.image.avatar()
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({
            email,
            sub,
            name: googleName,
            picture,
          })
          await mockSuccess(code, { id_token: idToken })

          const result = await service.authenticate(code)

          await expect(
            repository.findOneByOrFail({ id: result.entity.id }),
          ).resolves.toMatchObject({
            authProfile: { google: { sub, name: googleName, picture } },
          })
        })
      })

      describe("Given a valid code for an existing email", () => {
        let service: GoogleAuthService
        let repository: Repository<Account>
        let eventEmitter: EventEmitter2
        let existingAccount: Account

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
          repository = module.get<Repository<Account>>(
            getRepositoryToken(Account),
          )
          eventEmitter = module.get<EventEmitter2>(EventEmitter2)

          const created = repository.create({
            email: faker.internet.email().toLowerCase(),
          })
          await repository.save(created)
          // Reload through the repository so the eager `oauthTokens`
          // relation is hydrated as [] (matching what the production
          // code path sees after its own findOne).
          existingAccount = await repository.findOneByOrFail({ id: created.id })
        })

        it("should return the existing entity with isNewUser: false", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = googleFakes.idToken({ email: existingAccount.email })
          await mockSuccess(code, { id_token: idToken })

          const result = await service.authenticate(code)

          expect(result.entity.id).toBe(existingAccount.id)
          expect(result.entity.email).toBe(existingAccount.email)
          expect(result.isNewUser).toBe(false)
        })

        it("should not create a new account", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = googleFakes.idToken({ email: existingAccount.email })
          await mockSuccess(code, { id_token: idToken })

          await service.authenticate(code)

          const accounts = await repository.find()
          expect(accounts).toHaveLength(1)
        })

        it("should emit a AuthenticatedEvent with provider 'google'", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = googleFakes.idToken({ email: existingAccount.email })
          await mockSuccess(code, { id_token: idToken })
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          await service.authenticate(code)

          expect(emitSpy).toHaveBeenCalledWith(
            AuthenticatedEvent.EVENT_NAME,
            expect.objectContaining({
              entity: expect.objectContaining({ id: existingAccount.id }),
              provider: "google",
            }),
          )
        })

        it("should not emit a RegisteredEvent", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = googleFakes.idToken({ email: existingAccount.email })
          await mockSuccess(code, { id_token: idToken })
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          await service.authenticate(code)

          expect(emitSpy).not.toHaveBeenCalledWith(
            RegisteredEvent.EVENT_NAME,
            expect.anything(),
          )
        })
      })

      describe("Email normalization", () => {
        let service: GoogleAuthService
        let repository: Repository<Account>

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
          repository = module.get<Repository<Account>>(
            getRepositoryToken(Account),
          )
        })

        it("should store email as lowercase regardless of Google ID token case", async () => {
          const code = faker.string.alphanumeric(20)
          const email = "Test.User@EXAMPLE.COM"
          const idToken = googleFakes.idToken({ email })
          await mockSuccess(code, { id_token: idToken })

          const result = await service.authenticate(code)

          expect(result.entity.email).toBe(email.toLowerCase())
        })

        it("should find existing account with case-insensitive email lookup", async () => {
          const code = faker.string.alphanumeric(20)
          const email = "existing@example.com"
          const existingAccount = repository.create({ email })
          await repository.save(existingAccount)

          const idToken = googleFakes.idToken({
            email: "EXISTING@EXAMPLE.COM",
          })
          await mockSuccess(code, { id_token: idToken })

          const result = await service.authenticate(code)

          expect(result.entity.id).toBe(existingAccount.id)
          expect(result.isNewUser).toBe(false)
        })
      })

      describe("Given Google returns a 4xx HTTP error", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleCodeExchangeException", async () => {
          const code = faker.string.alphanumeric(20)
          await mockHttpError(code, { statusCode: 400 })

          await expect(service.authenticate(code)).rejects.toBeInstanceOf(
            GoogleCodeExchangeException,
          )
        })
      })

      describe("Given Google returns a 5xx HTTP error", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleServiceException", async () => {
          const code = faker.string.alphanumeric(20)
          await mockHttpError(code, { statusCode: 500 })

          await expect(service.authenticate(code)).rejects.toBeInstanceOf(
            GoogleServiceException,
          )
        })
      })

      describe("Given a network error calling Google", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleNetworkException", async () => {
          const code = faker.string.alphanumeric(20)
          await mockNetworkError(code)

          await expect(service.authenticate(code)).rejects.toBeInstanceOf(
            GoogleNetworkException,
          )
        })
      })

      describe("Given Google returns 200 with no access_token", () => {
        let service: GoogleAuthService
        let fetchSpy: jest.SpyInstance

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        afterEach(() => {
          fetchSpy?.mockRestore()
        })

        it("should throw GoogleTokenException with reason 'missing access_token in token response'", async () => {
          const idToken = googleFakes.idToken({ email: faker.internet.email() })
          fetchSpy = jest
            .spyOn(global, "fetch")
            .mockResolvedValue(
              new Response(
                JSON.stringify({ id_token: idToken, expires_in: 3600 }),
                { status: 200 },
              ),
            )

          await expect(
            service.authenticate(faker.string.alphanumeric(20)),
          ).rejects.toMatchError(GoogleTokenException, {
            reason: "missing access_token in token response",
          })
        })
      })

      describe("Given Google returns 200 with no expires_in", () => {
        let service: GoogleAuthService
        let fetchSpy: jest.SpyInstance

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        afterEach(() => {
          fetchSpy?.mockRestore()
        })

        it("should throw GoogleTokenException with reason 'missing expires_in in token response'", async () => {
          const idToken = googleFakes.idToken({ email: faker.internet.email() })
          fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
            new Response(
              JSON.stringify({
                id_token: idToken,
                access_token: faker.string.alphanumeric(40),
              }),
              { status: 200 },
            ),
          )

          await expect(
            service.authenticate(faker.string.alphanumeric(20)),
          ).rejects.toMatchError(GoogleTokenException, {
            reason: "missing expires_in in token response",
          })
        })
      })

      describe("Given Google returns 200 with no id_token", () => {
        let service: GoogleAuthService
        let fetchSpy: jest.SpyInstance

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        afterEach(() => {
          fetchSpy?.mockRestore()
        })

        it("should throw GoogleTokenException with reason 'missing id_token in token response'", async () => {
          fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
            new Response(
              JSON.stringify({
                access_token: faker.string.alphanumeric(40),
                expires_in: 3600,
              }),
              { status: 200 },
            ),
          )

          await expect(
            service.authenticate(faker.string.alphanumeric(20)),
          ).rejects.toMatchError(GoogleTokenException, {
            reason: "missing id_token in token response",
          })
        })
      })

      describe("Given the ID token is missing the sub claim", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleTokenException with reason 'missing sub in ID token'", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = jwt.sign(
            { email: faker.internet.email(), name: faker.person.fullName() },
            faker.string.alphanumeric(32),
          )
          await mockSuccess(code, { id_token: idToken })

          await expect(service.authenticate(code)).rejects.toMatchError(
            GoogleTokenException,
            {
              reason: "missing sub in ID token",
            },
          )
        })
      })

      describe("Given the ID token is missing the email claim", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleTokenException with reason 'missing email in ID token'", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = jwt.sign(
            { sub: faker.string.numeric(10), name: faker.person.fullName() },
            faker.string.alphanumeric(32),
          )
          await mockSuccess(code, { id_token: idToken })

          await expect(service.authenticate(code)).rejects.toMatchError(
            GoogleTokenException,
            {
              reason: "missing email in ID token",
            },
          )
        })
      })

      describe("Given the ID token has email_verified: false", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw EmailNotVerifiedException", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({ email, email_verified: false })
          await mockSuccess(code, { id_token: idToken })

          await expect(service.authenticate(code)).rejects.toBeInstanceOf(
            EmailNotVerifiedException,
          )
        })

        it("should include the email on the exception", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({ email, email_verified: false })
          await mockSuccess(code, { id_token: idToken })

          await expect(service.authenticate(code)).rejects.toMatchObject({
            email,
          })
        })
      })

      describe("Given the ID token has email_verified: true", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should not throw and proceed normally", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({ email, email_verified: true })
          await mockSuccess(code, { id_token: idToken })

          await expect(service.authenticate(code)).resolves.not.toThrow()
        })
      })

      describe("Given the ID token has no email_verified claim", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should not throw and proceed normally", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = googleFakes.idToken({ email })
          await mockSuccess(code, { id_token: idToken })

          await expect(service.authenticate(code)).resolves.not.toThrow()
        })
      })

      describe("OAuth token persistence", () => {
        let service: GoogleAuthService
        let accountRepo: Repository<Account>
        let tokenRepo: Repository<OAuthToken>

        beforeEach(async () => {
          const module = await buildModule({ register })
          service = module.get<GoogleAuthService>(GoogleAuthService)
          accountRepo = module.get<Repository<Account>>(
            getRepositoryToken(Account),
          )
          tokenRepo = module.get<Repository<OAuthToken>>(
            getRepositoryToken(OAuthToken),
          )
        })

        describe("on first sign-in (new account)", () => {
          it("should persist a google OAuthToken row linked to the account with access/refresh tokens, expiresAt, and scopes", async () => {
            const code = faker.string.alphanumeric(20)
            const email = faker.internet.email()
            const refreshToken = faker.string.alphanumeric(40)
            const idToken = googleFakes.idToken({ email })
            const response = await googleOAuthClient.mockCodeExchange({
              code,
              clientId: googleAuth.clientId,
              clientSecret: googleAuth.clientSecret,
              redirectUri: googleAuth.redirectUri,
              idToken,
              refreshToken,
            })

            const before = Date.now()
            const result = await service.authenticate(code)
            const after = Date.now()

            const tokens = await tokenRepo.find({
              where: { account: { id: result.entity.id } },
            })
            expect(tokens).toHaveLength(1)
            const stored = tokens[0]
            expect(stored.provider).toBe("google")
            expect(stored.accessToken).toBe(response.access_token)
            expect(stored.refreshToken).toBe(refreshToken)
            expect(stored.scopes).toEqual(response.scope.split(" "))
            const expiresAt = new Date(stored.expiresAt).getTime()
            expect(expiresAt).toBeGreaterThanOrEqual(
              before + response.expires_in * 1000 - 1000,
            )
            expect(expiresAt).toBeLessThanOrEqual(
              after + response.expires_in * 1000 + 1000,
            )
          })

          it("should eagerly load the token onto account.oauthTokens on subsequent reads", async () => {
            const code = faker.string.alphanumeric(20)
            const email = faker.internet.email()
            await googleOAuthClient.mockCodeExchange({
              code,
              clientId: googleAuth.clientId,
              clientSecret: googleAuth.clientSecret,
              redirectUri: googleAuth.redirectUri,
              idToken: googleFakes.idToken({ email }),
              refreshToken: faker.string.alphanumeric(40),
            })

            const result = await service.authenticate(code)
            const loaded = await accountRepo.findOneByOrFail({
              id: result.entity.id,
            })

            expect(loaded.oauthTokens).toHaveLength(1)
            expect(loaded.oauthTokens![0].provider).toBe("google")
          })
        })

        describe("on subsequent sign-in where Google omits refresh_token", () => {
          it("should preserve the existing refreshToken and replace the rest", async () => {
            const email = faker.internet.email().toLowerCase()

            const firstCode = faker.string.alphanumeric(20)
            const originalRefreshToken = faker.string.alphanumeric(40)
            await googleOAuthClient.mockCodeExchange({
              code: firstCode,
              clientId: googleAuth.clientId,
              clientSecret: googleAuth.clientSecret,
              redirectUri: googleAuth.redirectUri,
              idToken: googleFakes.idToken({ email }),
              refreshToken: originalRefreshToken,
            })
            await service.authenticate(firstCode)

            const secondCode = faker.string.alphanumeric(20)
            const secondResponse = await googleOAuthClient.mockCodeExchange({
              code: secondCode,
              clientId: googleAuth.clientId,
              clientSecret: googleAuth.clientSecret,
              redirectUri: googleAuth.redirectUri,
              idToken: googleFakes.idToken({ email }),
            })

            const result = await service.authenticate(secondCode)

            const tokens = await tokenRepo.find({
              where: { account: { id: result.entity.id } },
            })
            expect(tokens).toHaveLength(1)
            expect(tokens[0].accessToken).toBe(secondResponse.access_token)
            expect(tokens[0].refreshToken).toBe(originalRefreshToken)
          })
        })

        describe("on subsequent sign-in where Google returns a new refresh_token", () => {
          it("should overwrite the stored refreshToken", async () => {
            const email = faker.internet.email().toLowerCase()

            const firstCode = faker.string.alphanumeric(20)
            await googleOAuthClient.mockCodeExchange({
              code: firstCode,
              clientId: googleAuth.clientId,
              clientSecret: googleAuth.clientSecret,
              redirectUri: googleAuth.redirectUri,
              idToken: googleFakes.idToken({ email }),
              refreshToken: faker.string.alphanumeric(40),
            })
            await service.authenticate(firstCode)

            const secondCode = faker.string.alphanumeric(20)
            const newRefreshToken = faker.string.alphanumeric(40)
            await googleOAuthClient.mockCodeExchange({
              code: secondCode,
              clientId: googleAuth.clientId,
              clientSecret: googleAuth.clientSecret,
              redirectUri: googleAuth.redirectUri,
              idToken: googleFakes.idToken({ email }),
              refreshToken: newRefreshToken,
            })

            const result = await service.authenticate(secondCode)
            const tokens = await tokenRepo.find({
              where: { account: { id: result.entity.id } },
            })

            expect(tokens[0].refreshToken).toBe(newRefreshToken)
          })
        })

        describe("when the account already has a token entry for a different provider", () => {
          it("should leave the other provider's entry untouched", async () => {
            const email = faker.internet.email().toLowerCase()
            const seeded = await accountRepo.save(accountRepo.create({ email }))
            await tokenRepo.save(
              tokenRepo.create({
                account: seeded,
                provider: "github",
                accessToken: faker.string.alphanumeric(40),
                refreshToken: faker.string.alphanumeric(40),
                expiresAt: new Date(Date.now() + 3600 * 1000),
                scopes: ["repo"],
              }),
            )

            const code = faker.string.alphanumeric(20)
            await googleOAuthClient.mockCodeExchange({
              code,
              clientId: googleAuth.clientId,
              clientSecret: googleAuth.clientSecret,
              redirectUri: googleAuth.redirectUri,
              idToken: googleFakes.idToken({ email }),
              refreshToken: faker.string.alphanumeric(40),
            })

            const result = await service.authenticate(code)
            const tokens = await tokenRepo.find({
              where: { account: { id: result.entity.id } },
            })

            expect(tokens).toHaveLength(2)
            const github = tokens.find((t) => t.provider === "github")
            expect(github).toBeDefined()
            expect(tokens.find((t) => t.provider === "google")).toBeDefined()
          })
        })
      })

      describe("Given googleAuth is not configured", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule({
            register,
            overrides: {
              googleAuth: undefined,
              magicLink: {
                mailer: {
                  host: "localhost",
                  port: 1025,
                  from: faker.internet.email(),
                  welcome: {
                    subject: "Welcome",
                    html: '<a href="{{token}}">Link</a>',
                  },
                  welcomeBack: {
                    subject: "Welcome back",
                    html: '<a href="{{token}}">Link</a>',
                  },
                },
              },
            } as Partial<AuthOptions>,
          })

          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw Error when authenticate() is called", async () => {
          await expect(
            service.authenticate(faker.string.alphanumeric(20)),
          ).rejects.toThrow(
            "Google OAuth is not configured. Provide googleAuth in AuthOptions to use GoogleAuthService.",
          )
        })
      })
    })
  })
})
