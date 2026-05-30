import { faker } from "@faker-js/faker"
import { executionContext, express } from "@neomaventures/fixtures"
import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  InternalServerErrorException,
} from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { MinioClient } from "fixtures/storage/minio"
import { of, throwError } from "rxjs"

import { TEMPORARY_LINK_METADATA_KEY } from "../decorators/temporary-link.decorator"
import { StorageService } from "../services/storage.service"
import { UlidIdGenerator } from "../services/ulid-id-generator.service"
import { type StorageOptions, STORAGE_OPTIONS } from "../storage.options"

import { TemporaryLinkInterceptor } from "./temporary-link.interceptor"

const options: StorageOptions = {
  endpoint: process.env.STORAGE_ENDPOINT!,
  region: process.env.STORAGE_REGION!,
  bucket: process.env.STORAGE_BUCKET!,
  accessKeyId: process.env.STORAGE_ACCESS_KEY!,
  secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  entity: class {} as any,
}

const createModule = async (
  overrides: Partial<StorageOptions> = {},
): Promise<TestingModule> =>
  Test.createTestingModule({
    providers: [
      TemporaryLinkInterceptor,
      StorageService,
      UlidIdGenerator,
      { provide: STORAGE_OPTIONS, useValue: { ...options, ...overrides } },
    ],
  }).compile()

// Handler function with @TemporaryLink() metadata (default expiresIn)
function downloadHandler(): void {}
Reflect.defineMetadata(
  TEMPORARY_LINK_METADATA_KEY,
  { expiresIn: undefined },
  downloadHandler,
)

// Handler function with custom expiresIn
function customExpiryHandler(): void {}
Reflect.defineMetadata(
  TEMPORARY_LINK_METADATA_KEY,
  { expiresIn: 600 },
  customExpiryHandler,
)

describe("TemporaryLinkInterceptor", () => {
  let module: TestingModule
  let interceptor: TemporaryLinkInterceptor
  let storageService: StorageService
  let minio: MinioClient

  beforeEach(async () => {
    module = await createModule()
    interceptor = module.get(TemporaryLinkInterceptor)
    storageService = module.get(StorageService)
    minio = new MinioClient()
  })

  afterEach(async () => {
    await module.close()
  })

  describe("intercept()", () => {
    describe("Given a handler returns a Storable entity", () => {
      it("should redirect with HTTP 302 to a presigned URL", async () => {
        const content = faker.lorem.paragraph()
        const fileName = faker.system.fileName()
        const key = `${faker.string.alphanumeric(10)}-${fileName}`
        await storageService.store(key, Buffer.from(content), "text/plain")

        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          downloadHandler,
        ) as ExecutionContext

        const entity = { key, id: 1, originalName: fileName }
        const handler: CallHandler = { handle: () => of(entity) }

        const result = interceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.redirect).toHaveBeenCalledWith(
          HttpStatus.FOUND,
          expect.stringContaining(key),
        )
      })

      it("should generate a valid presigned URL that returns the file content", async () => {
        const content = faker.lorem.paragraph()
        const fileName = faker.system.fileName()
        const key = `${faker.string.alphanumeric(10)}-${fileName}`
        await storageService.store(key, Buffer.from(content), "text/plain")

        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          downloadHandler,
        ) as ExecutionContext

        const entity = { key, id: 1, originalName: fileName }
        const handler: CallHandler = { handle: () => of(entity) }

        const result = interceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        // Verify the file still exists in MinIO with correct content
        const stored = await minio.getObject(key)
        expect(stored.body).toBe(content)
      })
    })

    describe("Given a custom expiresIn is set", () => {
      it("should pass the custom expiresIn to the presigned URL", async () => {
        const content = faker.lorem.paragraph()
        const fileName = faker.system.fileName()
        const key = `${faker.string.alphanumeric(10)}-${fileName}`
        await storageService.store(key, Buffer.from(content), "text/plain")

        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          customExpiryHandler,
        ) as ExecutionContext

        const entity = { key, id: 1, originalName: fileName }
        const handler: CallHandler = { handle: () => of(entity) }

        const result = interceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.redirect).toHaveBeenCalledWith(
          HttpStatus.FOUND,
          expect.stringContaining(key),
        )

        // The presigned URL should contain X-Amz-Expires=600
        const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1]
        expect(redirectUrl).toContain("X-Amz-Expires=600")
      })
    })

    describe("Given the handler returns an object without a key", () => {
      it("should throw InternalServerErrorException", async () => {
        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          downloadHandler,
        ) as ExecutionContext

        const entity = { id: 1, originalName: "test.txt" }
        const handler: CallHandler = { handle: () => of(entity) }

        const result = interceptor.intercept(ctx, handler)

        await expect(
          new Promise((resolve, reject) => {
            result.subscribe({ next: resolve, error: reject })
          }),
        ).rejects.toMatchError(InternalServerErrorException)
      })
    })

    describe("Given the handler returns null", () => {
      it("should throw InternalServerErrorException", async () => {
        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          downloadHandler,
        ) as ExecutionContext

        const handler: CallHandler = { handle: () => of(null) }

        const result = interceptor.intercept(ctx, handler)

        await expect(
          new Promise((resolve, reject) => {
            result.subscribe({ next: resolve, error: reject })
          }),
        ).rejects.toMatchError(InternalServerErrorException)
      })
    })

    describe("Given the handler throws", () => {
      it("should propagate the error without running post-handler logic", async () => {
        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          downloadHandler,
        ) as ExecutionContext

        const handlerError = new Error("entity not found")
        const handler: CallHandler = {
          handle: () => throwError(() => handlerError),
        }

        const result = interceptor.intercept(ctx, handler)

        await expect(
          new Promise((resolve, reject) => {
            result.subscribe({ next: resolve, error: reject })
          }),
        ).rejects.toThrow("entity not found")

        expect(res.redirect).not.toHaveBeenCalled()
      })
    })
  })
})
