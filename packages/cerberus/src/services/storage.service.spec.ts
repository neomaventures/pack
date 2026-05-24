import { faker } from "@faker-js/faker"
import "@neoma/fixtures/matchers"
import { Test } from "@nestjs/testing"
import { MinioClient } from "fixtures/storage/minio"

import { CERBERUS_OPTIONS } from "../cerberus.options"
import { InvalidStorageKeyException } from "../exceptions/invalid-storage-key.exception"

import { StorageService } from "./storage.service"

describe("StorageService", () => {
  let service: StorageService
  let minio: MinioClient

  const options = {
    endpoint: process.env.STORAGE_ENDPOINT!,
    region: process.env.STORAGE_REGION!,
    bucket: process.env.STORAGE_BUCKET!,
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
    entity: class {},
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: CERBERUS_OPTIONS, useValue: options },
      ],
    }).compile()

    service = module.get(StorageService)
    minio = new MinioClient()
  })

  describe("store()", () => {
    describe("Given a valid key", () => {
      it("should upload the file to MinIO with the supplied key and content", async () => {
        const key = `${faker.string.alphanumeric(10)}-${faker.system.fileName()}`
        const content = faker.lorem.paragraph()
        const body = Buffer.from(content)
        const contentType = "text/plain"

        await service.store(key, body, contentType)

        const result = await minio.getObject(key)
        expect(result).toMatchObject({
          body: content,
          contentType,
        })
      })
    })

    describe("Given an empty key", () => {
      it("should throw InvalidStorageKeyException with reason 'empty'", async () => {
        const body = Buffer.from(faker.lorem.paragraph())

        await expect(
          service.store("", body, "text/plain"),
        ).rejects.toMatchError(InvalidStorageKeyException, { reason: "empty" })
      })
    })

    describe("Given a key exceeding 1024 bytes", () => {
      it("should throw InvalidStorageKeyException with reason 'too-long'", async () => {
        const key = "x".repeat(1500)
        const body = Buffer.from(faker.lorem.paragraph())

        await expect(
          service.store(key, body, "text/plain"),
        ).rejects.toMatchError(InvalidStorageKeyException, {
          reason: "too-long",
        })
      })
    })
  })

  describe("getSignedUrl()", () => {
    describe("Given a valid key", () => {
      it("should return a URL that resolves to the file content", async () => {
        const key = `${faker.string.alphanumeric(10)}-${faker.system.fileName()}`
        const content = faker.lorem.paragraph()
        const body = Buffer.from(content)

        await service.store(key, body, "text/plain")
        const url = await service.getSignedUrl(key)

        const response = await fetch(url)
        const fetchedContent = await response.text()

        expect(fetchedContent).toEqual(content)
      })
    })
  })
})
