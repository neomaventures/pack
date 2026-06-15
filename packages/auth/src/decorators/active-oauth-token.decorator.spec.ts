import { faker } from "@faker-js/faker"
import { executionContext } from "@neomaventures/fixtures"
import { google } from "@neomaventures/google-fixtures"
import { RequestContextModule } from "@neomaventures/request-context"
import { type ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { CustomParamFactory } from "@nestjs/common/interfaces"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { Account } from "../entities/account.entity"
import { OAuthToken } from "../entities/oauth-token.entity"
import { setPrincipal } from "../principal/principal.slot"

import { ActiveOAuthToken } from "./active-oauth-token.decorator"

type Args = Record<string, { factory: CustomParamFactory; data: unknown }>

const buildToken = (overrides: Partial<OAuthToken> = {}): OAuthToken => {
  const token = new OAuthToken()
  token.id = faker.string.uuid()
  token.provider = "google"
  token.accessToken = google.accessToken()
  token.refreshToken = faker.string.alphanumeric(40)
  token.expiresAt = new Date(Date.now() + 3600 * 1000)
  token.scopes = ["openid", "email", "profile"]
  Object.assign(token, overrides)
  return token
}

const buildAccount = (tokens?: OAuthToken[]): Account => {
  const account = new Account()
  account.id = faker.string.uuid()
  account.email = faker.internet.email().toLowerCase()
  account.permissions = []
  account.oauthTokens = tokens
  return account
}

describe("ActiveOAuthTokenDecorator", () => {
  let factory: CustomParamFactory
  let providerArg: unknown
  let cls: ClsService
  let context: ExecutionContext

  beforeAll(async () => {
    class ActiveOAuthTokenDecoratorTest {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      public test(@ActiveOAuthToken("google") _value: unknown): void {}
    }

    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      ActiveOAuthTokenDecoratorTest,
      "test",
    ) as Args

    const arg = args[Object.keys(args)[0]]
    factory = arg.factory
    providerArg = arg.data

    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    cls = module.get(ClsService)
    context = executionContext() as ExecutionContext
  })

  describe("Given no principal is in context", () => {
    it("should return null", () => {
      cls.run(() => {
        expect(factory(providerArg, context)).toBeNull()
      })
    })
  })

  describe("Given a principal with an active token is in context", () => {
    it("should return the snapshot for the requested provider", () => {
      const accessToken = google.accessToken()
      const expiresAt = new Date(Date.now() + 3600 * 1000)
      const scopes = ["openid", "email"]
      const stored = buildToken({ accessToken, expiresAt, scopes })

      cls.run(() => {
        setPrincipal(buildAccount([stored]))
        expect(factory(providerArg, context)).toEqual({
          accessToken,
          expiresAt,
          scopes,
        })
      })
    })
  })

  describe("Given a principal without an activeToken method is in context", () => {
    it("should return null without throwing", () => {
      cls.run(() => {
        // Defensive: a fixture or stale principal object might not be a
        // real Account instance.
        setPrincipal({ id: "x", email: "y" } as unknown as Account)
        expect(factory(providerArg, context)).toBeNull()
      })
    })
  })
})
