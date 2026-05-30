import { express } from "@neoma/fixtures"
import { type Request } from "express"

import { type StorageIdGenerator } from "../interfaces/id-generator.interface"
import { type OriginalFileInfo } from "../interfaces/key-resolver.interface"

import { DefaultKeyResolver } from "./default-key.resolver"

describe("DefaultKeyResolver", () => {
  let resolver: DefaultKeyResolver
  let idGenerator: jest.Mocked<StorageIdGenerator>

  const fileInfo = (
    overrides: Partial<OriginalFileInfo> = {},
  ): OriginalFileInfo => ({
    originalName: "photo.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    ...overrides,
  })

  beforeEach(() => {
    resolver = new DefaultKeyResolver()
    idGenerator = { generate: jest.fn().mockReturnValue("01HXYZ") }
  })

  describe("resolve()", () => {
    describe("Given a file with a clean original name", () => {
      it("should return `${id}-${originalName}`", () => {
        const result = resolver.resolve(
          express.request() as unknown as Request,
          idGenerator,
          fileInfo({ originalName: "photo.jpg" }),
        )

        expect(result).toBe("01HXYZ-photo.jpg")
      })
    })

    describe("Given a file name with POSIX path components", () => {
      it("should strip the path and use the basename", () => {
        const result = resolver.resolve(
          express.request() as unknown as Request,
          idGenerator,
          fileInfo({ originalName: "/etc/passwd" }),
        )

        expect(result).toBe("01HXYZ-passwd")
      })
    })

    describe("Given a file name with Windows path components", () => {
      it("should strip the path and use the basename", () => {
        const result = resolver.resolve(
          express.request() as unknown as Request,
          idGenerator,
          fileInfo({ originalName: "C:\\Users\\foo\\bar.png" }),
        )

        expect(result).toBe("01HXYZ-bar.png")
      })
    })

    describe("Given a file name with relative path traversal", () => {
      it("should strip the traversal and use the basename", () => {
        const result = resolver.resolve(
          express.request() as unknown as Request,
          idGenerator,
          fileInfo({ originalName: "../../etc/shadow" }),
        )

        expect(result).toBe("01HXYZ-shadow")
      })
    })
  })
})
