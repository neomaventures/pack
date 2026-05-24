import { INTERCEPTORS_METADATA } from "@nestjs/common/constants"

import { TestKeyResolver } from "fixtures/resolvers/test-key-resolver"
import { UploadInterceptor } from "../interceptors/upload.interceptor"

import { Upload, UPLOAD_METADATA_KEY } from "./upload.decorator"

describe("UploadDecorator", () => {
  describe("Given no options are provided", () => {
    class DefaultTest {
      @Upload()
      public handler(): void {}
    }

    it("should attach the UploadInterceptor", () => {
      const interceptors = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        DefaultTest.prototype.handler,
      )
      expect(interceptors).toContain(UploadInterceptor)
    })
  })

  describe("Given a maxSize is provided", () => {
    class MaxSizeTest {
      @Upload({ maxSize: 1000 })
      public handler(): void {}
    }

    it("should store the maxSize in metadata", () => {
      const metadata = Reflect.getMetadata(
        UPLOAD_METADATA_KEY,
        MaxSizeTest.prototype.handler,
      )
      expect(metadata).toMatchObject({ maxSize: 1000 })
    })

    it("should attach the UploadInterceptor", () => {
      const interceptors = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        MaxSizeTest.prototype.handler,
      )
      expect(interceptors).toContain(UploadInterceptor)
    })
  })

  describe("Given types are provided", () => {
    class TypesTest {
      @Upload({ types: ["text/csv"] })
      public handler(): void {}
    }

    it("should store the types in metadata", () => {
      const metadata = Reflect.getMetadata(
        UPLOAD_METADATA_KEY,
        TypesTest.prototype.handler,
      )
      expect(metadata).toMatchObject({ types: ["text/csv"] })
    })

    it("should attach the UploadInterceptor", () => {
      const interceptors = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        TypesTest.prototype.handler,
      )
      expect(interceptors).toContain(UploadInterceptor)
    })
  })

  describe("Given a custom key resolver is provided", () => {
    class CustomKeyResolverTest {
      @Upload({ key: TestKeyResolver })
      public handler(): void {}
    }

    it("should store the key resolver class in metadata", () => {
      const metadata = Reflect.getMetadata(
        UPLOAD_METADATA_KEY,
        CustomKeyResolverTest.prototype.handler,
      )
      expect(metadata).toMatchObject({ key: TestKeyResolver })
    })

    it("should attach the UploadInterceptor", () => {
      const interceptors = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        CustomKeyResolverTest.prototype.handler,
      )
      expect(interceptors).toContain(UploadInterceptor)
    })
  })
})
