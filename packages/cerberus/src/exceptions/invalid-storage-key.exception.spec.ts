import { HttpStatus } from "@nestjs/common"

import { InvalidStorageKeyException } from "./invalid-storage-key.exception"

const { INTERNAL_SERVER_ERROR } = HttpStatus

describe("InvalidStorageKeyException", () => {
  describe("Given the key is empty", () => {
    let exception: InvalidStorageKeyException

    beforeEach(() => {
      exception = new InvalidStorageKeyException("", "empty")
    })

    it("should have the key property", () => {
      expect(exception.key).toBe("")
    })

    it("should have reason set to 'empty'", () => {
      expect(exception.reason).toBe("empty")
    })

    it("should have a descriptive message", () => {
      expect(exception.message).toBe("Storage key cannot be empty.")
    })

    describe("getStatus()", () => {
      it("should return 500 (Internal Server Error)", () => {
        expect(exception.getStatus()).toBe(INTERNAL_SERVER_ERROR)
      })
    })

    describe("getResponse()", () => {
      it("should include all metadata fields", () => {
        expect(exception.getResponse()).toMatchObject({
          statusCode: INTERNAL_SERVER_ERROR,
          message: "Storage key cannot be empty.",
          reason: "empty",
          error: "Internal Server Error",
        })
        expect(exception.getResponse()).not.toHaveProperty("key")
      })
    })
  })

  describe("Given the key exceeds 1024 bytes", () => {
    const longKey = "x".repeat(1500)
    let exception: InvalidStorageKeyException

    beforeEach(() => {
      exception = new InvalidStorageKeyException(longKey, "too-long")
    })

    it("should have the key property", () => {
      expect(exception.key).toBe(longKey)
    })

    it("should have reason set to 'too-long'", () => {
      expect(exception.reason).toBe("too-long")
    })

    it("should have a descriptive message including the byte count", () => {
      expect(exception.message).toBe(
        "Storage key exceeds 1024 bytes (got 1500 bytes).",
      )
    })

    describe("getStatus()", () => {
      it("should return 500 (Internal Server Error)", () => {
        expect(exception.getStatus()).toBe(INTERNAL_SERVER_ERROR)
      })
    })
  })
})
