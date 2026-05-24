import {
  executionContext,
  express,
  MockRequest,
  multerFile,
} from "@neoma/fixtures"
import "@neoma/fixtures/matchers"
import { type CallHandler, type ExecutionContext } from "@nestjs/common"
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter"
import { Test, type TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TestIdGenerator } from "fixtures/services/test-id-generator"
import { MinioClient } from "fixtures/storage/minio"
import { lastValueFrom, type Observable, of, throwError } from "rxjs"
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm"

import { CerberusOptions } from "@lib/cerberus.options"
import { UlidIdGenerator } from "@lib/services/ulid-id-generator.service"

import { CerberusModule } from "../"
import { TestKeyResolver } from "fixtures/resolvers/test-key-resolver"
import { Upload } from "../decorators/upload.decorator"
import { FileCreatedEvent } from "../events/file-created.event"
import { FileStoreUnreachableException } from "../exceptions/file-store-unreachable.exception"
import { FileTooLargeException } from "../exceptions/file-too-large.exception"
import { NoFileProvidedException } from "../exceptions/no-file-provided.exception"
import { UnsupportedFileTypeException } from "../exceptions/unsupported-file-type.exception"
import { type Storable } from "../interfaces/storable.interface"

import { UploadInterceptor } from "./upload.interceptor"

const GLOBAL_MAX_FILE_SIZE = 5000
const ROUTE_MAX_FILE_SIZE = 50

@Entity()
class TestUpload implements Storable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public originalName!: string

  @Column()
  public mimeType!: string

  @Column()
  public size!: number

  @Column()
  public key!: string

  @Column()
  public bucket!: string
}

const options: CerberusOptions = {
  endpoint: process.env.STORAGE_ENDPOINT!,
  region: process.env.STORAGE_REGION!,
  bucket: process.env.STORAGE_BUCKET!,
  accessKeyId: process.env.STORAGE_ACCESS_KEY!,
  secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  entity: TestUpload,
}
const allowedMimeTypes = ["text/plain", "text/csv", "image/png", "image/jpeg"]

class UploadHandlerClass {
  @Upload()
  public uploadHandler(): void {}
}

const interceptorInvocation = ({
  file = multerFile(),
  handlerMethod = UploadHandlerClass.prototype.uploadHandler,
  response = of({}) as Observable<unknown>,
}: {
  file?: Express.Multer.File | null
  handlerMethod?: (...args: any[]) => unknown
  response?: Observable<unknown>
} = {}): {
  req: MockRequest
  ctx: ExecutionContext
  handler: CallHandler<any>
} => {
  const req = express.request({ file })
  const ctx = executionContext(
    req,
    express.response(),
    handlerMethod,
  ) as ExecutionContext
  const handler: CallHandler = { handle: () => response }
  return { req, ctx, handler }
}

describe("UploadInterceptor", () => {
  let module: TestingModule
  let dataSource: DataSource
  let interceptor: UploadInterceptor
  let eventEmitter: EventEmitter2
  let minio: MinioClient
  let keyGenerator: TestIdGenerator

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [TestUpload],
          synchronize: true,
        }),
        EventEmitterModule.forRoot(),
        CerberusModule.forRoot({
          ...options,
          allowedMimeTypes,
          maxFileSize: GLOBAL_MAX_FILE_SIZE,
        }),
      ],
      providers: [TestKeyResolver],
    })
      .overrideProvider(UlidIdGenerator)
      .useClass(TestIdGenerator)
      .compile()

    interceptor = module.get(UploadInterceptor)
    dataSource = module.get(DataSource)
    eventEmitter = module.get(EventEmitter2)
    keyGenerator = module.get<TestIdGenerator>(UlidIdGenerator)
    minio = new MinioClient()
  })

  afterEach(async () => {
    eventEmitter.removeAllListeners(FileCreatedEvent.EVENT_NAME)
    await module.close()
  })

  describe("intercept()", () => {
    describe("Given a valid file upload", () => {
      it("should upload the file to MinIO", async () => {
        const file = multerFile()
        const { ctx, handler, req } = interceptorInvocation({ file })

        await lastValueFrom(await interceptor.intercept(ctx, handler))

        const storedFile: Storable = req.cerberus!.storedFile!
        const stored = await minio.getObject(storedFile.key)
        expect(stored).toMatchObject({
          body: file.buffer.toString(),
          contentType: file.mimetype,
        })
      })

      it("should create an entity and attach it to req.cerberus.storedFile", async () => {
        const file = multerFile()
        const { ctx, handler, req } = interceptorInvocation({ file })

        await interceptor.intercept(ctx, handler)

        expect(req.cerberus!.storedFile).toMatchObject({
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          bucket: options.bucket,
          key: expect.stringMatching(
            new RegExp(`^[0-9A-HJKMNP-TV-Z]{26}-${file.originalname}$`),
          ),
        })
      })

      it("should preserve the handler response unchanged", async () => {
        const handlerResponse = { message: "ok" }
        const { ctx, handler } = interceptorInvocation({
          response: of(handlerResponse),
        })

        const emitted = await lastValueFrom(
          await interceptor.intercept(ctx, handler),
        )

        expect(emitted).toEqual(handlerResponse)
      })

      it("should persist the entity to the database", async () => {
        const file = multerFile()
        const { ctx, handler } = interceptorInvocation({ file })

        await lastValueFrom(await interceptor.intercept(ctx, handler))

        const entity = await dataSource
          .getRepository(TestUpload)
          .findOne({ where: { originalName: file.originalname } })

        expect(entity).toMatchObject({
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          bucket: options.bucket,
        })
      })
    })

    describe("Given a custom Key Resolver class is provided", () => {
      class CustomKeyResolverClass {
        @Upload({ key: TestKeyResolver })
        public uploadHandler(): void {}
      }

      it("should create an entity and attach it to req.cerberus.storedFile", async () => {
        const resolver = module.get(TestKeyResolver)
        const file = multerFile()
        const { ctx, handler, req } = interceptorInvocation({
          file,
          handlerMethod: CustomKeyResolverClass.prototype.uploadHandler,
        })
        req.headers["x-custom-filename"] = "custom-name.txt"

        await interceptor.intercept(ctx, handler)

        expect(req.cerberus!.storedFile).toMatchObject({
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          bucket: options.bucket,
          key: resolver.lastKey(),
        })
      })

      it("should upload the file to MinIO", async () => {
        const resolver = module.get(TestKeyResolver)
        const file = multerFile()
        const { ctx, handler, req } = interceptorInvocation({
          file,
          handlerMethod: CustomKeyResolverClass.prototype.uploadHandler,
        })
        req.headers["x-custom-filename"] = "custom-name.txt"

        await interceptor.intercept(ctx, handler)

        const stored = await minio.getObject(resolver.lastKey()!)
        expect(stored).toMatchObject({
          body: file.buffer.toString(),
          contentType: file.mimetype,
        })
      })
    })

    describe("Given a custom Key Resolver function is provided", () => {
      class CustomKeyResolverClass {
        @Upload({
          key: (req, id, file) => new TestKeyResolver().resolve(req, id, file),
        })
        public uploadHandler(): void {}
      }

      it("should create an entity and attach it to req.cerberus.storedFile", async () => {
        const file = multerFile()
        const { ctx, handler, req } = interceptorInvocation({
          file,
          handlerMethod: CustomKeyResolverClass.prototype.uploadHandler,
        })
        req.headers["x-custom-filename"] = "custom-name.txt"

        await interceptor.intercept(ctx, handler)

        expect(req.cerberus!.storedFile).toMatchObject({
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          bucket: options.bucket,
          key: `${keyGenerator.lastId()}-custom-name.txt-${file.size}`,
        })
      })

      it("should upload the file to MinIO", async () => {
        const file = multerFile()
        const { ctx, handler, req } = interceptorInvocation({
          file,
          handlerMethod: CustomKeyResolverClass.prototype.uploadHandler,
        })
        req.headers["x-custom-filename"] = "custom-name.txt"

        await interceptor.intercept(ctx, handler)

        const stored = await minio.getObject(
          `${keyGenerator.lastId()}-custom-name.txt-${file.size}`,
        )
        expect(stored).toMatchObject({
          body: file.buffer.toString(),
          contentType: file.mimetype,
        })
      })
    })

    describe("Given no file on the request", () => {
      it("should throw NoFileProvidedException", async () => {
        const { ctx, handler } = interceptorInvocation({ file: null })

        await expect(interceptor.intercept(ctx, handler)).rejects.toMatchError(
          NoFileProvidedException,
        )
      })
    })

    describe("Given maxFileSize is exceeded", () => {
      it("should throw FileTooLargeException with fileSize and maxSize", async () => {
        const fileSize = GLOBAL_MAX_FILE_SIZE * 2
        const { ctx, handler } = interceptorInvocation({
          file: multerFile({ size: fileSize }),
        })

        await expect(interceptor.intercept(ctx, handler)).rejects.toMatchError(
          FileTooLargeException,
          {
            fileSize,
            maxSize: GLOBAL_MAX_FILE_SIZE,
          },
        )
      })
    })

    describe("Given an unsupported MIME type", () => {
      it("should throw UnsupportedFileTypeException with mimeType and allowedTypes", async () => {
        const mimeType = "audio/vorbis"
        const { ctx, handler } = interceptorInvocation({
          file: multerFile({ mimetype: mimeType }),
        })

        await expect(interceptor.intercept(ctx, handler)).rejects.toMatchError(
          UnsupportedFileTypeException,
          {
            mimeType,
            allowedTypes: allowedMimeTypes,
          },
        )
      })
    })

    describe("Given per-route maxSize is exceeded", () => {
      class SmallFileHandlerClass {
        @Upload({ maxSize: ROUTE_MAX_FILE_SIZE })
        public smallHandler(): void {}
      }

      it("should throw FileTooLargeException with per-route maxSize", async () => {
        const fileSize = ROUTE_MAX_FILE_SIZE + 1
        const { ctx, handler } = interceptorInvocation({
          file: multerFile({ size: fileSize }),
          handlerMethod: SmallFileHandlerClass.prototype.smallHandler,
        })

        await expect(interceptor.intercept(ctx, handler)).rejects.toMatchError(
          FileTooLargeException,
          {
            fileSize,
            maxSize: ROUTE_MAX_FILE_SIZE,
          },
        )
      })
    })

    describe("Given per-route types mismatch", () => {
      class CsvHandlerClass {
        @Upload({ types: ["text/csv"] })
        public csvHandler(): void {}
      }

      it("should throw UnsupportedFileTypeException with per-route types", async () => {
        const mimeType = "text/plain"
        const { ctx, handler } = interceptorInvocation({
          file: multerFile({ mimetype: mimeType }),
          handlerMethod: CsvHandlerClass.prototype.csvHandler,
        })

        await expect(interceptor.intercept(ctx, handler)).rejects.toMatchError(
          UnsupportedFileTypeException,
          {
            mimeType,
            allowedTypes: ["text/csv"],
          },
        )
      })
    })

    describe("Given per-route types narrow global allowedMimeTypes", () => {
      class CsvOnlyHandlerClass {
        @Upload({ types: ["text/csv"] })
        public csvOnlyHandler(): void {}
      }

      it("should throw UnsupportedFileTypeException when file passes global but fails per-route", async () => {
        const mimeType = "text/plain"
        const { ctx, handler } = interceptorInvocation({
          file: multerFile({ mimetype: mimeType }),
          handlerMethod: CsvOnlyHandlerClass.prototype.csvOnlyHandler,
        })

        await expect(interceptor.intercept(ctx, handler)).rejects.toMatchError(
          UnsupportedFileTypeException,
          {
            mimeType,
            allowedTypes: ["text/csv"],
          },
        )
      })
    })

    describe("Given a successful upload", () => {
      it("should emit a FileCreatedEvent with the persisted entity", async () => {
        const file = multerFile()
        const { ctx, handler } = interceptorInvocation({ file })

        const receivedEvents: FileCreatedEvent[] = []
        eventEmitter.on(
          FileCreatedEvent.EVENT_NAME,
          (event: FileCreatedEvent) => {
            receivedEvents.push(event)
          },
        )

        await lastValueFrom(await interceptor.intercept(ctx, handler))

        expect(receivedEvents).toHaveLength(1)
        expect(receivedEvents[0]).toBeInstanceOf(FileCreatedEvent)
        expect(receivedEvents[0].entity).toMatchObject({
          id: expect.any(String),
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          bucket: options.bucket,
        })
      })
    })

    describe("Given the handler throws", () => {
      it("should not emit a FileCreatedEvent", async () => {
        const { ctx, handler } = interceptorInvocation({
          response: throwError(() => new Error("handler error")),
        })

        const receivedEvents: FileCreatedEvent[] = []
        eventEmitter.on(
          FileCreatedEvent.EVENT_NAME,
          (event: FileCreatedEvent) => {
            receivedEvents.push(event)
          },
        )

        await expect(
          lastValueFrom(await interceptor.intercept(ctx, handler)),
        ).rejects.toThrow("handler error")

        expect(receivedEvents).toHaveLength(0)
      })
    })

    describe("Given S3 is unreachable", () => {
      beforeEach(async () => {
        await module.close()
        module = await Test.createTestingModule({
          imports: [
            TypeOrmModule.forRoot({
              type: "sqlite",
              database: ":memory:",
              entities: [TestUpload],
              synchronize: true,
            }),
            EventEmitterModule.forRoot(),
            CerberusModule.forRoot({
              ...options,
              endpoint: "http://localhost:1",
              bucket: "unreachable-bucket",
              allowedMimeTypes,
            }),
          ],
        }).compile()
        interceptor = module.get(UploadInterceptor)
        eventEmitter = module.get(EventEmitter2)
      })

      it("should throw FileStoreUnreachableException with endpoint and bucket", async () => {
        const { ctx, handler } = interceptorInvocation()

        await expect(interceptor.intercept(ctx, handler)).rejects.toMatchError(
          FileStoreUnreachableException,
          {
            endpoint: "http://localhost:1",
            bucket: "unreachable-bucket",
          },
        )
      })
    })
  })
})
