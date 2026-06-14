import { faker } from "@faker-js/faker"
import * as auth from "@neomaventures/auth"
import {
  type OriginalFileInfo,
  type StorageIdGenerator,
} from "@neomaventures/storage"
import { type Request } from "express"

import { AccountAvatarKeyResolver } from "~profile/account-avatar-key.resolver"

/**
 * The resolver runs inside the storage interceptor after `@Authenticated()`
 * has accepted the request, so in production the principal is always present.
 * We exercise the happy path here and keep a single defensive test on the
 * `throw new UnauthorizedException` branch — even though it's only reachable
 * via guard misconfiguration, the contract is part of the resolver's public
 * surface and would otherwise drift silently.
 */
describe("AccountAvatarKeyResolver", () => {
  let resolver: AccountAvatarKeyResolver
  let getPrincipalSpy: jest.SpyInstance

  const idGenerator: StorageIdGenerator = {
    generate: (): string => "unused",
  }
  const fileInfo: OriginalFileInfo & { defaultKey: string } = {
    originalName: "avatar.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    defaultKey: "ignored",
  }
  const req = {} as Request

  beforeEach(() => {
    resolver = new AccountAvatarKeyResolver()
    getPrincipalSpy = jest.spyOn(auth, "getPrincipal")
  })

  afterEach(() => {
    getPrincipalSpy.mockRestore()
  })

  describe("resolve()", () => {
    describe("Given an authenticated request", () => {
      it("should return accounts/${accountId}/avatar", () => {
        const accountId = faker.string.uuid()
        getPrincipalSpy.mockReturnValue({
          id: accountId,
          email: faker.internet.email(),
        })

        const result = resolver.resolve(req, idGenerator, fileInfo)

        expect(result).toBe(`accounts/${accountId}/avatar`)
      })
    })

    describe("Given no principal on the request context", () => {
      it("should throw UnauthorizedException", () => {
        getPrincipalSpy.mockReturnValue(undefined)

        expect(() => resolver.resolve(req, idGenerator, fileInfo)).toThrow(
          /Unauthorized/i,
        )
      })
    })
  })
})
