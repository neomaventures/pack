import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { FileStoreUnreachableException } from "./file-store-unreachable.exception"

const { SERVICE_UNAVAILABLE } = HttpStatus

describe("FileStoreUnreachableException", () => {
  const endpoint = faker.internet.url()
  const bucket = faker.string.alphanumeric(10)
  const cause = faker.lorem.sentence()
  let exception: FileStoreUnreachableException

  beforeEach(() => {
    exception = new FileStoreUnreachableException(endpoint, bucket, cause)
  })

  it("should have the endpoint property", () => {
    expect(exception.endpoint).toBe(endpoint)
  })

  it("should have the bucket property", () => {
    expect(exception.bucket).toBe(bucket)
  })

  it("should have the cause property", () => {
    expect(exception.cause).toBe(cause)
  })

  it("should have a descriptive message", () => {
    expect(exception.message).toBe(
      `Unable to reach file store at ${endpoint} (bucket: ${bucket}).`,
    )
  })

  describe("getStatus()", () => {
    it("should return 503 (Service Unavailable)", () => {
      expect(exception.getStatus()).toBe(SERVICE_UNAVAILABLE)
    })
  })

  describe("getResponse()", () => {
    it("should include all metadata fields", () => {
      expect(exception.getResponse()).toMatchObject({
        statusCode: SERVICE_UNAVAILABLE,
        message: `Unable to reach file store at ${endpoint} (bucket: ${bucket}).`,
        endpoint,
        bucket,
        cause,
        error: "Service Unavailable",
      })
    })
  })
})
