import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { UnsupportedFileTypeException } from "./unsupported-file-type.exception"

const { UNSUPPORTED_MEDIA_TYPE } = HttpStatus

describe("UnsupportedFileTypeException", () => {
  const mimeType = faker.system.mimeType()
  const allowedTypes = [faker.system.mimeType(), faker.system.mimeType()]
  let exception: UnsupportedFileTypeException

  beforeEach(() => {
    exception = new UnsupportedFileTypeException(mimeType, allowedTypes)
  })

  it("should have the mimeType property", () => {
    expect(exception.mimeType).toBe(mimeType)
  })

  it("should have the allowedTypes property", () => {
    expect(exception.allowedTypes).toEqual(allowedTypes)
  })

  it("should have a descriptive message", () => {
    expect(exception.message).toBe(
      `File type "${mimeType}" is not supported. Allowed types: ${allowedTypes.join(", ")}.`,
    )
  })

  describe("getStatus()", () => {
    it("should return 415 (Unsupported Media Type)", () => {
      expect(exception.getStatus()).toBe(UNSUPPORTED_MEDIA_TYPE)
    })
  })

  describe("getResponse()", () => {
    it("should include all metadata fields", () => {
      expect(exception.getResponse()).toMatchObject({
        statusCode: UNSUPPORTED_MEDIA_TYPE,
        message: `File type "${mimeType}" is not supported. Allowed types: ${allowedTypes.join(", ")}.`,
        mimeType,
        allowedTypes,
        error: "Unsupported Media Type",
      })
    })
  })
})
