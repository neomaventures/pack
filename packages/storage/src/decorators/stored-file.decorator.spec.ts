import { faker } from "@faker-js/faker"
import { executionContext, express } from "@neomaventures/fixtures"
import { type ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { type CustomParamFactory } from "@nestjs/common/interfaces"

import { type Storable } from "../interfaces/storable.interface"

import { StoredFile } from "./stored-file.decorator"

type Args = Record<string, { factory: CustomParamFactory }>

const mockStoredFile: Storable = {
  id: faker.number.int(),
  originalName: faker.system.fileName(),
  mimeType: faker.system.mimeType(),
  size: faker.number.int({ min: 1, max: 10_000_000 }),
  key: `uploads/${faker.string.alphanumeric(26)}-${faker.system.fileName()}`,
  bucket: faker.string.alphanumeric(10),
}

describe("StoredFileDecorator", () => {
  let factory: CustomParamFactory

  beforeAll(() => {
    class StoredFileDecoratorTest {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      public test(@StoredFile() _value: Storable): void {}
    }

    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      StoredFileDecoratorTest,
      "test",
    ) as Args

    factory = args[Object.keys(args)[0]].factory
  })

  describe("Given the request has a stored file", () => {
    it("should return the stored file entity", () => {
      const req = express.request({
        storage: { storedFile: mockStoredFile },
      })
      const ctx = executionContext(req)

      expect(factory(null, ctx as ExecutionContext)).toEqual(mockStoredFile)
    })
  })

  describe("Given the request does not have a stored file", () => {
    it("should throw an Error", () => {
      const req = express.request()
      const ctx = executionContext(req)

      expect(() => factory(null, ctx as ExecutionContext)).toThrow(
        "@StoredFile() called without a stored file on the request. Have you applied the @Upload() decorator to this handler?",
      )
    })
  })

  describe("Given the request has storage namespace but no storedFile", () => {
    it("should throw an Error", () => {
      const req = express.request({ storage: {} })
      const ctx = executionContext(req)

      expect(() => factory(null, ctx as ExecutionContext)).toThrow(
        "@StoredFile() called without a stored file on the request. Have you applied the @Upload() decorator to this handler?",
      )
    })
  })
})
