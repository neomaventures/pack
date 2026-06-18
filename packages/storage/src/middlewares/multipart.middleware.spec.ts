import { Readable } from "stream"

import { faker } from "@faker-js/faker"
import { Test, type TestingModule } from "@nestjs/testing"
import { type NextFunction, type Request, type Response } from "express"

import { FileTooLargeException } from "../exceptions/file-too-large.exception"
import {
  type ResolvedStorageRootOptions,
  RESOLVED_STORAGE_OPTIONS,
} from "../storage.options"

import { MultipartMiddleware } from "./multipart.middleware"

const boundary = "----TestBoundary"

const buildMultipartBody = (
  fieldName: string,
  filename: string,
  content: string,
  contentType: string = "text/plain",
): Buffer => {
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"`,
    `Content-Type: ${contentType}`,
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n")
  return Buffer.from(body)
}

const buildMultipartRequest = (body: Buffer): Request => {
  const stream = new Readable()
  stream.push(body)
  stream.push(null)

  return Object.assign(stream, {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    method: "POST",
    url: "/uploads",
  }) as unknown as Request
}

const createModule = async (
  defaults: NonNullable<ResolvedStorageRootOptions["defaults"]> = {},
): Promise<TestingModule> => {
  const options: ResolvedStorageRootOptions = {
    endpoint: faker.internet.url(),
    region: faker.location.countryCode(),
    accessKeyId: faker.string.alphanumeric(20),
    secretAccessKey: faker.string.alphanumeric(40),
    entity: class {} as any,
    defaults,
  }

  return Test.createTestingModule({
    providers: [
      MultipartMiddleware,
      { provide: RESOLVED_STORAGE_OPTIONS, useValue: options },
    ],
  }).compile()
}

describe("MultipartMiddleware", () => {
  describe("Given a valid multipart request", () => {
    let module: TestingModule
    let middleware: MultipartMiddleware

    beforeEach(async () => {
      module = await createModule()
      middleware = module.get(MultipartMiddleware)
    })

    afterEach(async () => {
      await module.close()
    })

    it("should parse the file and set req.file", async () => {
      const content = faker.lorem.paragraph()
      const filename = faker.system.fileName()
      const body = buildMultipartBody("file", filename, content)
      const req = buildMultipartRequest(body)

      await new Promise<void>((resolve, reject) => {
        const next: NextFunction = (err?: any): void => {
          if (err) {
            reject(err as Error)
            return
          }
          resolve()
        }
        middleware.use(req, {} as Response, next)
      })

      expect(req.file).toMatchObject({
        originalname: filename,
        buffer: Buffer.from(content),
      })
    })
  })

  describe("Given maxFileSize is configured", () => {
    const maxFileSize = 10
    let module: TestingModule
    let middleware: MultipartMiddleware

    beforeEach(async () => {
      module = await createModule({ maxFileSize })
      middleware = module.get(MultipartMiddleware)
    })

    afterEach(async () => {
      await module.close()
    })

    describe("When the file exceeds maxFileSize", () => {
      it("should call next with FileTooLargeException", async () => {
        const content = faker.string.alphanumeric(100)
        const body = buildMultipartBody("file", "big.txt", content)
        const req = buildMultipartRequest(body)

        const error = await new Promise<unknown>((resolve) => {
          const next: NextFunction = (err?: any): void => {
            resolve(err)
          }
          middleware.use(req, {} as Response, next)
        })

        expect(error).toMatchError(FileTooLargeException, {
          fileSize: null,
          maxSize: maxFileSize,
        })
      })
    })
  })
})
