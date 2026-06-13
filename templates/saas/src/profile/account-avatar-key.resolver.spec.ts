import { faker } from "@faker-js/faker"
import * as auth from "@neomaventures/auth"
import {
  type OriginalFileInfo,
  type StorageIdGenerator,
} from "@neomaventures/storage"
import { type Request } from "express"

import { AccountAvatarKeyResolver } from "~profile/account-avatar-key.resolver"

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

      it("should be deterministic — same principal yields the same key", () => {
        const accountId = faker.string.uuid()
        getPrincipalSpy.mockReturnValue({
          id: accountId,
          email: faker.internet.email(),
        })

        const first = resolver.resolve(req, idGenerator, fileInfo)
        const second = resolver.resolve(req, idGenerator, fileInfo)

        expect(first).toBe(second)
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
