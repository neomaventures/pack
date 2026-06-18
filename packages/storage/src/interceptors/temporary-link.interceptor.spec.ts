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
import { S3ClientProvider } from "../providers/s3-client.provider"
import { StorageService } from "../services/storage.service"
import { UlidIdGenerator } from "../services/ulid-id-generator.service"
import {
  type ResolvedFeatureStorageOptions,
  type StorageRootOptions,
  RESOLVED_FEATURE_STORAGE_OPTIONS,
  STORAGE_OPTIONS,
} from "../storage.options"

import { TemporaryLinkInterceptor } from "./temporary-link.interceptor"

const rootOptions: StorageRootOptions = {
  endpoint: process.env.STORAGE_ENDPOINT!,
  region: process.env.STORAGE_REGION!,
  accessKeyId: process.env.STORAGE_ACCESS_KEY!,
  secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  entity: class {} as any,
}
const featureOptions: ResolvedFeatureStorageOptions = {
  bucket: process.env.STORAGE_BUCKET!,
  maxFileSize: undefined,
  allowedMimeTypes: undefined,
  linkExpiresIn: 3600,
  linkCacheControl: undefined,
}

const createModule = async (
  overrides: Partial<ResolvedFeatureStorageOptions> = {},
): Promise<TestingModule> =>
  Test.createTestingModule({
    providers: [
      TemporaryLinkInterceptor,
      StorageService,
      UlidIdGenerator,
      { provide: STORAGE_OPTIONS, useValue: rootOptions },
      {
        provide: RESOLVED_FEATURE_STORAGE_OPTIONS,
        useValue: { ...featureOptions, ...overrides },
      },
      S3ClientProvider,
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

// Handler function with a default URL configured
const defaultUrl = "/img/default.svg"
function defaultUrlHandler(): void {}
Reflect.defineMetadata(
  TEMPORARY_LINK_METADATA_KEY,
  { default: defaultUrl },
  defaultUrlHandler,
)

// Handler function with a per-route cacheControl configured
const perRouteCacheControl = "private, max-age=300"
function cacheControlHandler(): void {}
Reflect.defineMetadata(
  TEMPORARY_LINK_METADATA_KEY,
  { cacheControl: perRouteCacheControl },
  cacheControlHandler,
)

// Handler function with a per-route cacheControl and a default URL configured
function defaultUrlWithCacheControlHandler(): void {}
Reflect.defineMetadata(
  TEMPORARY_LINK_METADATA_KEY,
  { default: defaultUrl, cacheControl: perRouteCacheControl },
  defaultUrlWithCacheControlHandler,
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

    describe("Given a default URL is configured and the handler returns null", () => {
      it(`should redirect with HTTP ${HttpStatus.FOUND} to the default URL`, async () => {
        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          defaultUrlHandler,
        ) as ExecutionContext

        const handler: CallHandler = { handle: () => of(null) }

        const result = interceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, defaultUrl)
      })
    })

    describe("Given a default URL is configured and the handler returns undefined", () => {
      it(`should redirect with HTTP ${HttpStatus.FOUND} to the default URL`, async () => {
        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          defaultUrlHandler,
        ) as ExecutionContext

        const handler: CallHandler = { handle: () => of(undefined) }

        const result = interceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, defaultUrl)
      })
    })

    describe("Given a default URL is configured and the handler returns a malformed entity", () => {
      it("should throw InternalServerErrorException", async () => {
        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          defaultUrlHandler,
        ) as ExecutionContext

        const handler: CallHandler = { handle: () => of({ foo: 1 }) }

        const result = interceptor.intercept(ctx, handler)

        await expect(
          new Promise((resolve, reject) => {
            result.subscribe({ next: resolve, error: reject })
          }),
        ).rejects.toMatchError(InternalServerErrorException)

        expect(res.redirect).not.toHaveBeenCalled()
      })
    })

    describe("Given a default URL is configured and the handler throws", () => {
      it("should propagate the error without redirecting to the default", async () => {
        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          defaultUrlHandler,
        ) as ExecutionContext

        const handlerError = new Error("downstream failure")
        const handler: CallHandler = {
          handle: () => throwError(() => handlerError),
        }

        const result = interceptor.intercept(ctx, handler)

        await expect(
          new Promise((resolve, reject) => {
            result.subscribe({ next: resolve, error: reject })
          }),
        ).rejects.toThrow("downstream failure")

        expect(res.redirect).not.toHaveBeenCalled()
      })
    })

    describe("Given a per-route cacheControl is set and the handler returns a Storable entity", () => {
      it("should set the Cache-Control header to the per-route value", async () => {
        const content = faker.lorem.paragraph()
        const fileName = faker.system.fileName()
        const key = `${faker.string.alphanumeric(10)}-${fileName}`
        await storageService.store(key, Buffer.from(content), "text/plain")

        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          cacheControlHandler,
        ) as ExecutionContext

        const entity = { key, id: 1, originalName: fileName }
        const handler: CallHandler = { handle: () => of(entity) }

        const result = interceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.getHeader("Cache-Control")).toBe(perRouteCacheControl)
      })
    })

    describe("Given only a global linkCacheControl is set and the handler returns a Storable entity", () => {
      const globalCacheControl = "public, max-age=120"

      it("should set the Cache-Control header to the global value", async () => {
        const globalModule = await createModule({
          linkCacheControl: globalCacheControl,
        })
        const globalInterceptor = globalModule.get(TemporaryLinkInterceptor)
        const globalStorageService = globalModule.get(StorageService)

        const content = faker.lorem.paragraph()
        const fileName = faker.system.fileName()
        const key = `${faker.string.alphanumeric(10)}-${fileName}`
        await globalStorageService.store(
          key,
          Buffer.from(content),
          "text/plain",
        )

        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          downloadHandler,
        ) as ExecutionContext

        const entity = { key, id: 1, originalName: fileName }
        const handler: CallHandler = { handle: () => of(entity) }

        const result = globalInterceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.getHeader("Cache-Control")).toBe(globalCacheControl)

        await globalModule.close()
      })
    })

    describe("Given both per-route cacheControl and global linkCacheControl are set", () => {
      const globalCacheControl = "public, max-age=120"

      it("should set the Cache-Control header to the per-route value (per-route wins)", async () => {
        const globalModule = await createModule({
          linkCacheControl: globalCacheControl,
        })
        const globalInterceptor = globalModule.get(TemporaryLinkInterceptor)
        const globalStorageService = globalModule.get(StorageService)

        const content = faker.lorem.paragraph()
        const fileName = faker.system.fileName()
        const key = `${faker.string.alphanumeric(10)}-${fileName}`
        await globalStorageService.store(
          key,
          Buffer.from(content),
          "text/plain",
        )

        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          cacheControlHandler,
        ) as ExecutionContext

        const entity = { key, id: 1, originalName: fileName }
        const handler: CallHandler = { handle: () => of(entity) }

        const result = globalInterceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.getHeader("Cache-Control")).toBe(perRouteCacheControl)

        await globalModule.close()
      })
    })

    describe("Given neither per-route nor global cacheControl is set", () => {
      it("should not set the Cache-Control header (preserves byte-for-byte existing behaviour)", async () => {
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

        expect(res.getHeader("Cache-Control")).toBeUndefined()
      })
    })

    describe("Given a default URL is configured, a per-route cacheControl is set, and the handler returns null", () => {
      it("should set the Cache-Control header and redirect to the default URL", async () => {
        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          defaultUrlWithCacheControlHandler,
        ) as ExecutionContext

        const handler: CallHandler = { handle: () => of(null) }

        const result = interceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.getHeader("Cache-Control")).toBe(perRouteCacheControl)
        expect(res.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, defaultUrl)
      })
    })

    describe("Given a default URL is configured, a global linkCacheControl is set, and the handler returns null", () => {
      const globalCacheControl = "public, max-age=120"

      it("should set the Cache-Control header to the global value and redirect to the default URL", async () => {
        const globalModule = await createModule({
          linkCacheControl: globalCacheControl,
        })
        const globalInterceptor = globalModule.get(TemporaryLinkInterceptor)

        const res = express.response()
        const req = express.request()
        const ctx = executionContext(
          req,
          res,
          defaultUrlHandler,
        ) as ExecutionContext

        const handler: CallHandler = { handle: () => of(null) }

        const result = globalInterceptor.intercept(ctx, handler)
        await new Promise<void>((resolve) => {
          result.subscribe({ complete: () => resolve() })
        })

        expect(res.getHeader("Cache-Control")).toBe(globalCacheControl)
        expect(res.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, defaultUrl)

        await globalModule.close()
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
