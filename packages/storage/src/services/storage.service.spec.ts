import * as S3 from "@aws-sdk/client-s3"
import { faker } from "@faker-js/faker"
import { Test } from "@nestjs/testing"
import { MinioClient } from "fixtures/storage/minio"

import { InvalidStorageKeyException } from "../exceptions/invalid-storage-key.exception"
import { S3_CLIENT, S3ClientProvider } from "../providers/s3-client.provider"
import { STORAGE_OPTIONS } from "../storage.options"

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
        { provide: STORAGE_OPTIONS, useValue: options },
        S3ClientProvider,
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

  describe("bucket", () => {
    it("should return the configured bucket name", () => {
      expect(service.bucket).toBe(options.bucket)
    })
  })

  describe("S3 client injection", () => {
    describe("Given a stubbed S3_CLIENT provider", () => {
      it("should route store() calls through the injected client", async () => {
        const stub = { send: jest.fn().mockResolvedValue(undefined) }

        const module = await Test.createTestingModule({
          providers: [
            StorageService,
            { provide: STORAGE_OPTIONS, useValue: options },
            { provide: S3_CLIENT, useValue: stub },
          ],
        }).compile()

        const stubbedService = module.get(StorageService)
        const key = faker.string.alphanumeric(12)
        const body = Buffer.from(faker.lorem.paragraph())

        await stubbedService.store(key, body, "text/plain")

        expect(stub.send).toHaveBeenCalledTimes(1)
      })

      it("should resolve the same client instance the service uses", () => {
        const stub = { send: jest.fn() }

        return Test.createTestingModule({
          providers: [
            StorageService,
            { provide: STORAGE_OPTIONS, useValue: options },
            { provide: S3_CLIENT, useValue: stub },
          ],
        })
          .compile()
          .then((module) => {
            expect(module.get(S3_CLIENT)).toBe(stub)
          })
      })
    })

    describe("Given the service is instantiated", () => {
      it("should not construct its own S3Client (relies on the injected one)", async () => {
        const constructorSpy = jest.spyOn(S3, "S3Client")
        const stub = { send: jest.fn() }

        try {
          await Test.createTestingModule({
            providers: [
              StorageService,
              { provide: STORAGE_OPTIONS, useValue: options },
              { provide: S3_CLIENT, useValue: stub },
            ],
          }).compile()

          expect(constructorSpy).not.toHaveBeenCalled()
        } finally {
          constructorSpy.mockRestore()
        }
      })
    })
  })
})
