import { faker } from "@faker-js/faker"
import { MockServerClient } from "@neoma/mockserver"
import { DynamicModule } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, TestingModule } from "@nestjs/testing"
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm"
import { google } from "fixtures/fakes/google"
import {
  getTokenEndpoint,
  mockCodeExchangeApi,
  mockCodeExchangeApiHttpError,
  mockCodeExchangeApiNetworkError,
} from "fixtures/google/oauth-api"
import * as jwt from "jsonwebtoken"
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm"

import { AuthModule } from "../auth.module"
import { AuthOptions } from "../auth.options"
import { AuthenticatedEvent } from "../events/authenticated.event"
import { RegisteredEvent } from "../events/registered.event"
import { EmailNotVerifiedException } from "../exceptions/email-not-verified.exception"
import { GoogleCodeExchangeException } from "../exceptions/google-code-exchange.exception"
import { GoogleNetworkException } from "../exceptions/google-network.exception"
import { GoogleServiceException } from "../exceptions/google-service.exception"
import { GoogleTokenException } from "../exceptions/google-token.exception"
import {
  Authenticatable,
  AuthenticatableProfile,
} from "../interfaces/authenticatable.interface"

import { GoogleAuthService } from "./google-auth.service"

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id!: any

  @Column({ unique: true })
  public email!: string
}

@Entity()
class UserWithProfile implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id!: any

  @Column({ unique: true })
  public email!: string

  @Column({ type: "simple-json", nullable: true })
  public authProfile?: AuthenticatableProfile
}

const googleAuth = google.authOptions({ tokenEndpoint: getTokenEndpoint() })

async function buildModule<T extends Authenticatable>(
  entityClass: new () => T,
  register: (opts: AuthOptions) => DynamicModule,
  opts?: Partial<AuthOptions>,
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: "sqlite",
        database: ":memory:",
        entities: [entityClass],
        synchronize: true,
      }),
      TypeOrmModule.forFeature([entityClass]),
      register({
        secret: faker.internet.password(),
        expiresIn: "1h",
        entity: entityClass,
        googleAuth,
        ...opts,
      } as AuthOptions),
    ],
  }).compile()
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
    afterEach(async () => {
      await new MockServerClient(process.env.MOCKSERVER_URL!).reset()
    })

    describe("authenticate", () => {
      describe("Given a valid code for a new email", () => {
        let service: GoogleAuthService
        let repository: Repository<User>
        let eventEmitter: EventEmitter2

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
          repository = module.get<Repository<User>>(getRepositoryToken(User))
          eventEmitter = module.get<EventEmitter2>(EventEmitter2)
        })

        it("should create a new user entity", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = google.idToken({ email })
          await mockCodeExchangeApi(code, { id_token: idToken })

          await service.authenticate(code)

          const users = await repository.find()
          expect(users).toHaveLength(1)
          expect(users[0].email).toBe(email.toLowerCase())
        })

        it("should return the new entity with isNewUser: true", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = google.idToken({ email })
          await mockCodeExchangeApi(code, { id_token: idToken })

          const result = await service.authenticate<User>(code)

          expect(result.entity).toBeInstanceOf(User)
          expect(result.entity.email).toBe(email.toLowerCase())
          expect(result.isNewUser).toBe(true)
        })

        it("should emit a RegisteredEvent with provider 'google'", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = google.idToken({ email })
          await mockCodeExchangeApi(code, { id_token: idToken })
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          const result = await service.authenticate<User>(code)

          expect(emitSpy).toHaveBeenCalledWith(
            RegisteredEvent.EVENT_NAME,
            new RegisteredEvent(result.entity, "google"),
          )
        })

        it("should not emit a AuthenticatedEvent", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = google.idToken({ email })
          await mockCodeExchangeApi(code, { id_token: idToken })
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
          const idToken = google.idToken({
            email: faker.internet.email(),
            sub,
            name: googleName,
            picture,
          })
          await mockCodeExchangeApi(code, { id_token: idToken })

          const result = await service.authenticate(code)

          expect(result.profile).toEqual({ sub, name: googleName, picture })
        })
      })

      describe("Given a valid code for an existing email", () => {
        let service: GoogleAuthService
        let repository: Repository<User>
        let eventEmitter: EventEmitter2
        let existingUser: User

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
          repository = module.get<Repository<User>>(getRepositoryToken(User))
          eventEmitter = module.get<EventEmitter2>(EventEmitter2)

          existingUser = repository.create({
            email: faker.internet.email().toLowerCase(),
          })
          await repository.save(existingUser)
        })

        it("should return the existing entity with isNewUser: false", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = google.idToken({ email: existingUser.email })
          await mockCodeExchangeApi(code, { id_token: idToken })

          const result = await service.authenticate<User>(code)

          expect(result.entity.id).toBe(existingUser.id)
          expect(result.entity.email).toBe(existingUser.email)
          expect(result.isNewUser).toBe(false)
        })

        it("should not create a new user", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = google.idToken({ email: existingUser.email })
          await mockCodeExchangeApi(code, { id_token: idToken })

          await service.authenticate(code)

          const users = await repository.find()
          expect(users).toHaveLength(1)
        })

        it("should emit a AuthenticatedEvent with provider 'google'", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = google.idToken({ email: existingUser.email })
          await mockCodeExchangeApi(code, { id_token: idToken })
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          await service.authenticate(code)

          expect(emitSpy).toHaveBeenCalledWith(
            AuthenticatedEvent.EVENT_NAME,
            new AuthenticatedEvent(existingUser, "google"),
          )
        })

        it("should not emit a RegisteredEvent", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = google.idToken({ email: existingUser.email })
          await mockCodeExchangeApi(code, { id_token: idToken })
          const emitSpy = jest.spyOn(eventEmitter, "emit")

          await service.authenticate(code)

          expect(emitSpy).not.toHaveBeenCalledWith(
            RegisteredEvent.EVENT_NAME,
            expect.anything(),
          )
        })
      })

      describe("Given a valid code and entity with an authProfile column", () => {
        let service: GoogleAuthService
        let repository: Repository<UserWithProfile>

        beforeEach(async () => {
          const module = await buildModule(UserWithProfile, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
          repository = module.get<Repository<UserWithProfile>>(
            getRepositoryToken(UserWithProfile),
          )
        })

        it("should write Google profile data to entity.authProfile.google", async () => {
          const code = faker.string.alphanumeric(20)
          const sub = faker.string.numeric(10)
          const googleName = faker.person.fullName()
          const picture = faker.image.avatar()
          const email = faker.internet.email()
          const idToken = google.idToken({
            email,
            sub,
            name: googleName,
            picture,
          })
          await mockCodeExchangeApi(code, { id_token: idToken })

          const result = await service.authenticate<UserWithProfile>(code)

          await expect(
            repository.findOneByOrFail({ id: result.entity.id }),
          ).resolves.toMatchObject({
            authProfile: { google: { sub, name: googleName, picture } },
          })
        })
      })

      describe("Given a valid code and entity WITHOUT profile property", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should not throw (profile writing is skipped gracefully)", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = google.idToken({ email: faker.internet.email() })
          await mockCodeExchangeApi(code, { id_token: idToken })

          await expect(service.authenticate(code)).resolves.not.toThrow()
        })
      })

      describe("Email normalization", () => {
        let service: GoogleAuthService
        let repository: Repository<User>

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
          repository = module.get<Repository<User>>(getRepositoryToken(User))
        })

        it("should store email as lowercase regardless of Google ID token case", async () => {
          const code = faker.string.alphanumeric(20)
          const email = "Test.User@EXAMPLE.COM"
          const idToken = google.idToken({ email })
          await mockCodeExchangeApi(code, { id_token: idToken })

          const result = await service.authenticate<User>(code)

          expect(result.entity.email).toBe(email.toLowerCase())
        })

        it("should find existing user with case-insensitive email lookup", async () => {
          const code = faker.string.alphanumeric(20)
          const email = "existing@example.com"
          const existingUser = repository.create({ email })
          await repository.save(existingUser)

          const idToken = google.idToken({ email: "EXISTING@EXAMPLE.COM" })
          await mockCodeExchangeApi(code, { id_token: idToken })

          const result = await service.authenticate<User>(code)

          expect(result.entity.id).toBe(existingUser.id)
          expect(result.isNewUser).toBe(false)
        })
      })

      describe("Given Google returns a 4xx HTTP error", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleCodeExchangeException", async () => {
          const code = faker.string.alphanumeric(20)
          await mockCodeExchangeApiHttpError(code, { statusCode: 400 })

          await expect(service.authenticate(code)).rejects.toBeInstanceOf(
            GoogleCodeExchangeException,
          )
        })
      })

      describe("Given Google returns a 5xx HTTP error", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleServiceException", async () => {
          const code = faker.string.alphanumeric(20)
          await mockCodeExchangeApiHttpError(code, { statusCode: 500 })

          await expect(service.authenticate(code)).rejects.toBeInstanceOf(
            GoogleServiceException,
          )
        })
      })

      describe("Given a network error calling Google", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleNetworkException", async () => {
          const code = faker.string.alphanumeric(20)
          await mockCodeExchangeApiNetworkError(code)

          await expect(service.authenticate(code)).rejects.toBeInstanceOf(
            GoogleNetworkException,
          )
        })
      })

      describe("Given the ID token is missing the sub claim", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleTokenException with reason 'missing sub in ID token'", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = jwt.sign(
            { email: faker.internet.email(), name: faker.person.fullName() },
            faker.string.alphanumeric(32),
          )
          await mockCodeExchangeApi(code, { id_token: idToken })

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
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw GoogleTokenException with reason 'missing email in ID token'", async () => {
          const code = faker.string.alphanumeric(20)
          const idToken = jwt.sign(
            { sub: faker.string.numeric(10), name: faker.person.fullName() },
            faker.string.alphanumeric(32),
          )
          await mockCodeExchangeApi(code, { id_token: idToken })

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
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should throw EmailNotVerifiedException", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = google.idToken({ email, email_verified: false })
          await mockCodeExchangeApi(code, { id_token: idToken })

          await expect(service.authenticate(code)).rejects.toBeInstanceOf(
            EmailNotVerifiedException,
          )
        })

        it("should include the email on the exception", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = google.idToken({ email, email_verified: false })
          await mockCodeExchangeApi(code, { id_token: idToken })

          await expect(service.authenticate(code)).rejects.toMatchObject({
            email,
          })
        })
      })

      describe("Given the ID token has email_verified: true", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should not throw and proceed normally", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = google.idToken({ email, email_verified: true })
          await mockCodeExchangeApi(code, { id_token: idToken })

          await expect(service.authenticate(code)).resolves.not.toThrow()
        })
      })

      describe("Given the ID token has no email_verified claim", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule(User, register)
          service = module.get<GoogleAuthService>(GoogleAuthService)
        })

        it("should not throw and proceed normally", async () => {
          const code = faker.string.alphanumeric(20)
          const email = faker.internet.email()
          const idToken = google.idToken({ email })
          await mockCodeExchangeApi(code, { id_token: idToken })

          await expect(service.authenticate(code)).resolves.not.toThrow()
        })
      })

      describe("Given googleAuth is not configured", () => {
        let service: GoogleAuthService

        beforeEach(async () => {
          const module = await buildModule(User, register, {
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
          } as Partial<AuthOptions>)

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
