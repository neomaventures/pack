import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
// UlidIdGenerator is intentionally imported past the public barrel: it's
// the default implementation behind the IdGenerator contract, kept out of
// the package's public API. Consumers wanting a deterministic id in tests
// (or production) override it via this same deep-import path — see the
// "Customizing the ID generator" section in the package README.
import { UlidIdGenerator } from "@neomaventures/storage/services/ulid-id-generator.service"
import { HttpStatus } from "@nestjs/common"
import { TestIdGenerator } from "fixtures/services/test-id-generator"
import { MinioClient } from "fixtures/storage/minio"
import request from "supertest"

const {
  CREATED,
  BAD_REQUEST,
  PAYLOAD_TOO_LARGE,
  UNSUPPORTED_MEDIA_TYPE,
  SERVICE_UNAVAILABLE,
} = HttpStatus
const sampleFileName = `${faker.hacker.ingverb().toLowerCase().replace(/\s+/g, "-")}.txt`
const sampleFileContent = faker.hacker.phrase()
const sampleFileBuffer = Buffer.from(sampleFileContent)
const minio = new MinioClient()

describe("POST /uploads", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  let keyGenerator: TestIdGenerator

  beforeEach(async () => {
    app = await managedAppInstance({
      module: "e2e/app/app.module.ts#AppModule",
      build: (builder) => {
        return builder
          .overrideProvider(UlidIdGenerator)
          .useClass(TestIdGenerator)
      },
    })

    keyGenerator = app.get<TestIdGenerator>(UlidIdGenerator)
  })

  describe("When a file is uploaded", () => {
    it(`should respond with HTTP ${CREATED} and the stored file entity`, () => {
      return request(app.getHttpServer())
        .post("/uploads")
        .attach("file", sampleFileBuffer, sampleFileName)
        .expect(CREATED)
        .expect(({ body }) => {
          expect(body).toEqual({
            id: expect.any(String),
            originalName: sampleFileName,
            mimeType: "text/plain",
            bucket: process.env.STORAGE_BUCKET,
            size: sampleFileContent.length,
            key: `${keyGenerator.lastId()}-${sampleFileName}`,
            source: "form",
          })
        })
    })

    it("should store the file in MinIO with correct content", async () => {
      const response = await request(app.getHttpServer())
        .post("/uploads")
        .attach("file", sampleFileBuffer, sampleFileName)
        .expect(CREATED)

      const object = await minio.getObject(response.body.key as string)

      expect(object).toMatchObject({
        body: sampleFileContent,
        contentType: "text/plain",
      })
    })
  })

  describe("When a file is uploaded to a route that customises the key with a StorageKeyResolver class", () => {
    const xCustomFilename = `${faker.hacker.ingverb().toLowerCase().replace(/\s+/g, "-")}.txt`

    it(`should respond with HTTP ${CREATED} and store the file using the custom key`, () => {
      return request(app.getHttpServer())
        .post("/uploads/custom/class")
        .attach("file", sampleFileBuffer, sampleFileName)
        .set("X-Custom-Filename", xCustomFilename)
        .expect(CREATED)
        .expect(({ body }) => {
          expect(body).toEqual({
            id: expect.any(String),
            originalName: sampleFileName,
            mimeType: "text/plain",
            bucket: process.env.STORAGE_BUCKET,
            size: sampleFileContent.length,
            key: `${keyGenerator.lastId()}-${xCustomFilename}-${sampleFileBuffer.length}`,
            source: "custom",
          })
        })
    })

    it("should store the file in MinIO with correct content", async () => {
      const {
        body: { key },
      } = await request(app.getHttpServer())
        .post("/uploads/custom/class")
        .attach("file", sampleFileBuffer, sampleFileName)
        .set("X-Custom-Filename", xCustomFilename)
        .expect(CREATED)

      const object = await minio.getObject(key as string)

      expect(object).toMatchObject({
        body: sampleFileContent,
        contentType: "text/plain",
      })
    })
  })

  describe("When a file is uploaded to a route that customises the key with a StorageKeyResolver function", () => {
    const xCustomFilename = `${faker.hacker.ingverb().toLowerCase().replace(/\s+/g, "-")}.txt`

    it(`should respond with HTTP ${CREATED} and store the file using the custom key`, () => {
      return request(app.getHttpServer())
        .post("/uploads/custom/function")
        .attach("file", sampleFileBuffer, sampleFileName)
        .set("X-Custom-Filename", xCustomFilename)
        .expect(CREATED)
        .expect(({ body }) => {
          expect(body).toEqual({
            id: expect.any(String),
            originalName: sampleFileName,
            mimeType: "text/plain",
            bucket: process.env.STORAGE_BUCKET,
            size: sampleFileContent.length,
            key: `${keyGenerator.lastId()}-${xCustomFilename}-${sampleFileBuffer.length}`,
            source: "custom",
          })
        })
    })

    it("should store the file in MinIO with correct content", async () => {
      const {
        body: { key },
      } = await request(app.getHttpServer())
        .post("/uploads/custom/function")
        .attach("file", sampleFileBuffer, sampleFileName)
        .set("X-Custom-Filename", xCustomFilename)
        .expect(CREATED)

      const object = await minio.getObject(key as string)

      expect(object).toMatchObject({
        body: sampleFileContent,
        contentType: "text/plain",
      })
    })
  })

  describe("When no file is provided", () => {
    it(`should respond with HTTP ${BAD_REQUEST}`, () => {
      return request(app.getHttpServer())
        .post("/uploads")
        .expect(BAD_REQUEST)
        .expect({
          statusCode: BAD_REQUEST,
          message: "No file was provided in the request.",
          error: "Bad Request",
        })
    })
  })

  describe("When a file is uploaded that is larger than the global size limit", () => {
    it(`should respond with HTTP ${PAYLOAD_TOO_LARGE} with no file stored or entity persisted`, () => {
      return request(app.getHttpServer())
        .post("/uploads")
        .attach("file", Buffer.alloc(501, "x"), "oversized.txt")
        .expect(PAYLOAD_TOO_LARGE)
        .expect({
          statusCode: PAYLOAD_TOO_LARGE,
          fileSize: null,
          maxSize: 500,
          error: "Payload Too Large",
          message: "File exceeds the maximum allowed size of 500 bytes.",
        })
    })

    it("should not have stored the file", async () => {
      const objectsBefore = await minio.countObjects()

      await request(app.getHttpServer())
        .post("/uploads/small")
        .attach("file", Buffer.alloc(501, "x"), "medium.txt")
        .expect(PAYLOAD_TOO_LARGE)

      const objectsAfter = await minio.countObjects()
      expect(objectsAfter).toBe(objectsBefore)
    })
  })

  describe("When a file is uploaded that is smaller than the global size limit but exceeds per-route size limit", () => {
    it(`should respond with HTTP ${PAYLOAD_TOO_LARGE}`, () => {
      return request(app.getHttpServer())
        .post("/uploads/small")
        .attach("file", Buffer.alloc(100, "x"), "medium.txt")
        .expect(PAYLOAD_TOO_LARGE)
        .expect({
          statusCode: PAYLOAD_TOO_LARGE,
          fileSize: 100,
          maxSize: 50,
          error: "Payload Too Large",
          message:
            "File size 100 bytes exceeds the maximum allowed size of 50 bytes.",
        })
    })

    it("should not have stored the file", async () => {
      const objectsBefore = await minio.countObjects()

      await request(app.getHttpServer())
        .post("/uploads/small")
        .attach("file", Buffer.alloc(100, "x"), "medium.txt")
        .expect(PAYLOAD_TOO_LARGE)

      const objectsAfter = await minio.countObjects()
      expect(objectsAfter).toBe(objectsBefore)
    })
  })

  describe("When the file type is not in per-route types", () => {
    it(`should respond with HTTP ${UNSUPPORTED_MEDIA_TYPE} with no file stored or entity persisted`, () => {
      return request(app.getHttpServer())
        .post("/uploads/csv")
        .attach("file", Buffer.from("plain text content"), {
          filename: "notes.txt",
          contentType: "text/plain",
        })
        .expect(UNSUPPORTED_MEDIA_TYPE)
        .expect({
          statusCode: UNSUPPORTED_MEDIA_TYPE,
          mimeType: "text/plain",
          allowedTypes: ["text/csv"],
          error: "Unsupported Media Type",
          message:
            'File type "text/plain" is not supported. Allowed types: text/csv.',
        })
    })

    it("should not have stored the file", async () => {
      const objectsBefore = await minio.countObjects()

      await request(app.getHttpServer())
        .post("/uploads/csv")
        .attach("file", Buffer.from("plain text content"), {
          filename: "notes.txt",
          contentType: "text/plain",
        })
        .expect(UNSUPPORTED_MEDIA_TYPE)

      const objectsAfter = await minio.countObjects()
      expect(objectsAfter).toBe(objectsBefore)
    })
  })
})

describe("POST /uploads — S3 unreachable", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance(
      "e2e/app/app.unreachable.module.ts#UnreachableAppModule",
    )
  })

  describe("When S3 is unreachable", () => {
    it(`should respond with HTTP ${SERVICE_UNAVAILABLE}`, () => {
      return request(app.getHttpServer())
        .post("/uploads")
        .attach("file", sampleFileBuffer, sampleFileName)
        .expect(SERVICE_UNAVAILABLE)
        .expect({
          statusCode: SERVICE_UNAVAILABLE,
          message:
            "Unable to reach file store at http://localhost:1 (bucket: unreachable-bucket).",
          endpoint: "http://localhost:1",
          bucket: "unreachable-bucket",
          cause: "AWS SDK error wrapper for AggregateError",
          error: "Service Unavailable",
        })
    })
  })
})
