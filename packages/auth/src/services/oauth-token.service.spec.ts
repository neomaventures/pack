import { faker } from "@faker-js/faker"
import { RequestContextModule } from "@neomaventures/request-context"
import { Test, type TestingModule } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { type OAuthAuthenticatable } from "../interfaces/oauth-authenticatable.interface"
import { type OAuthTokenable } from "../interfaces/oauth-tokenable.interface"
import { setPrincipal } from "../principal/principal.slot"

import { OAuthTokenService } from "./oauth-token.service"

const buildPrincipal = (tokens?: OAuthTokenable[]): OAuthAuthenticatable => {
  const principal: OAuthAuthenticatable = {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    oauthTokens: tokens,
  }
  return principal
}

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

describe("OAuthTokenService", () => {
  let service: OAuthTokenService
  let cls: ClsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
      providers: [OAuthTokenService],
    }).compile()

    service = module.get(OAuthTokenService)
    cls = module.get(ClsService)
  })

  describe("getActiveToken()", () => {
    describe("Given no principal is in context", () => {
      it("should return null", () => {
        cls.run(() => {
          expect(service.getActiveToken("google")).toBeNull()
        })
      })
    })

    describe("Given the principal has no oauthTokens field", () => {
      it("should return null", () => {
        cls.run(() => {
          setPrincipal(buildPrincipal(undefined))
          expect(service.getActiveToken("google")).toBeNull()
        })
      })
    })

    describe("Given the principal has an empty oauthTokens array", () => {
      it("should return null", () => {
        cls.run(() => {
          setPrincipal(buildPrincipal([]))
          expect(service.getActiveToken("google")).toBeNull()
        })
      })
    })

    describe("Given the principal has no token for the requested provider", () => {
      it("should return null", () => {
        cls.run(() => {
          setPrincipal(buildPrincipal([buildToken({ provider: "github" })]))
          expect(service.getActiveToken("google")).toBeNull()
        })
      })
    })

    describe("Given the principal has an active token for the provider", () => {
      it("should return a snapshot with accessToken, expiresAt, and scopes", () => {
        const accessToken = faker.string.alphanumeric(40)
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const scopes = ["openid", "email"]
        const stored = buildToken({ accessToken, expiresAt, scopes })

        cls.run(() => {
          setPrincipal(buildPrincipal([stored]))

          expect(service.getActiveToken("google")).toEqual({
            accessToken,
            expiresAt,
            scopes,
          })
        })
      })

      it("should not include refreshToken on the snapshot", () => {
        cls.run(() => {
          setPrincipal(buildPrincipal([buildToken()]))

          const snapshot = service.getActiveToken("google")
          expect(snapshot).not.toBeNull()
          expect(snapshot).not.toHaveProperty("refreshToken")
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
          expect(service.getActiveToken("google")).toBeNull()
        })
      })
    })

    describe("Given expiresAt arrives as a string (defensive fixture)", () => {
      it("should treat it as a Date for the expiry check and the snapshot", () => {
        const accessToken = faker.string.alphanumeric(40)
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const stored = {
          ...buildToken({ accessToken }),
          expiresAt: expiresAt.toISOString() as unknown as Date,
        }

        cls.run(() => {
          setPrincipal(buildPrincipal([stored]))

          const snapshot = service.getActiveToken("google")
          expect(snapshot).not.toBeNull()
          expect(snapshot!.expiresAt).toBeInstanceOf(Date)
          expect(snapshot!.expiresAt.getTime()).toBe(expiresAt.getTime())
        })
      })
    })
  })
})
