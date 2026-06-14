import { faker } from "@faker-js/faker"
import { RequestContextModule } from "@neomaventures/request-context"
import { type ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { CustomParamFactory } from "@nestjs/common/interfaces"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { type OAuthAuthenticatable } from "../interfaces/oauth-authenticatable.interface"
import { type OAuthTokenable } from "../interfaces/oauth-tokenable.interface"
import { setPrincipal } from "../principal/principal.slot"

import { OAuthToken } from "./oauth-token.decorator"

type Args = Record<string, { factory: CustomParamFactory; data: unknown }>

const buildPrincipal = (tokens?: OAuthTokenable[]): OAuthAuthenticatable => ({
  id: faker.string.uuid(),
  email: faker.internet.email().toLowerCase(),
  oauthTokens: tokens,
})

const buildToken = (
  overrides: Partial<OAuthTokenable> = {},
): OAuthTokenable => ({
  id: faker.string.uuid(),
  principal: { id: faker.string.uuid(), email: faker.internet.email() },
  provider: "google",
  accessToken: faker.string.alphanumeric(40),
  refreshToken: faker.string.alphanumeric(40),
  expiresAt: new Date(Date.now() + 3600 * 1000),
  scopes: ["openid", "email", "profile"],
  ...overrides,
})

describe("OAuthTokenDecorator", () => {
  let factory: CustomParamFactory
  let providerArg: unknown
  let cls: ClsService

  beforeAll(async () => {
    class OAuthTokenDecoratorTest {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      public test(@OAuthToken("google") _value: unknown): void {}
    }

    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      OAuthTokenDecoratorTest,
      "test",
    ) as Args

    const arg = args[Object.keys(args)[0]]
    factory = arg.factory
    providerArg = arg.data

    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    cls = module.get(ClsService)
  })

  describe("Given no principal is in context", () => {
    it("should return null", () => {
      cls.run(() => {
        expect(
          factory(providerArg, {} as unknown as ExecutionContext),
        ).toBeNull()
      })
    })
  })

  describe("Given the principal has no oauthTokens field", () => {
    it("should return null", () => {
      cls.run(() => {
        setPrincipal(buildPrincipal(undefined))
        expect(
          factory(providerArg, {} as unknown as ExecutionContext),
        ).toBeNull()
      })
    })
  })

  describe("Given the principal has no token for the requested provider", () => {
    it("should return null", () => {
      cls.run(() => {
        setPrincipal(buildPrincipal([buildToken({ provider: "github" })]))
        expect(
          factory(providerArg, {} as unknown as ExecutionContext),
        ).toBeNull()
      })
    })
  })

  describe("Given the principal has an active token for the provider", () => {
    it("should return the snapshot without refreshToken", () => {
      const accessToken = faker.string.alphanumeric(40)
      const expiresAt = new Date(Date.now() + 3600 * 1000)
      const scopes = ["openid", "email"]
      const stored = buildToken({ accessToken, expiresAt, scopes })

      cls.run(() => {
        setPrincipal(buildPrincipal([stored]))

        const result = factory(providerArg, {} as unknown as ExecutionContext)
        expect(result).toEqual({ accessToken, expiresAt, scopes })
        expect(result).not.toHaveProperty("refreshToken")
      })
    })
  })

  describe("Given the principal has an expired token for the provider", () => {
    it("should return null", () => {
      const expired = buildToken({
        expiresAt: new Date(Date.now() - 60 * 1000),
      })

      cls.run(() => {
        setPrincipal(buildPrincipal([expired]))
        expect(
          factory(providerArg, {} as unknown as ExecutionContext),
        ).toBeNull()
      })
    })
  })
})
