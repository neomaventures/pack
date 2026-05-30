import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { FileTooLargeException } from "./file-too-large.exception"

const { PAYLOAD_TOO_LARGE } = HttpStatus

describe("FileTooLargeException", () => {
  describe("Given a known file size", () => {
    const fileSize = faker.number.int({ min: 1_000_001, max: 10_000_000 })
    const maxSize = faker.number.int({ min: 100_000, max: 1_000_000 })
    let exception: FileTooLargeException

    beforeEach(() => {
      exception = new FileTooLargeException(fileSize, maxSize)
    })

    it("should expose fileSize and maxSize properties", () => {
      expect(exception).toMatchObject({ fileSize, maxSize })
    })

    it("should return 413 with file size in the message", () => {
      expect(exception.getStatus()).toBe(PAYLOAD_TOO_LARGE)
      expect(exception.getResponse()).toMatchObject({
        statusCode: PAYLOAD_TOO_LARGE,
        message: `File size ${fileSize} bytes exceeds the maximum allowed size of ${maxSize} bytes.`,
        fileSize,
        maxSize,
        error: "Payload Too Large",
      })
    })
  })

  describe("Given an unknown file size (null)", () => {
    const maxSize = faker.number.int({ min: 100_000, max: 1_000_000 })
    let exception: FileTooLargeException

    beforeEach(() => {
      exception = new FileTooLargeException(null, maxSize)
    })

    it("should expose fileSize as null", () => {
      expect(exception).toMatchObject({ fileSize: null, maxSize })
    })

    it("should return 413 without file size in the message", () => {
      expect(exception.getStatus()).toBe(PAYLOAD_TOO_LARGE)
      expect(exception.getResponse()).toMatchObject({
        statusCode: PAYLOAD_TOO_LARGE,
        message: `File exceeds the maximum allowed size of ${maxSize} bytes.`,
        fileSize: null,
        maxSize,
        error: "Payload Too Large",
      })
    })
  })
})
