import { INTERCEPTORS_METADATA } from "@nestjs/common/constants"

import { TemporaryLinkInterceptor } from "../interceptors/temporary-link.interceptor"

import {
  TEMPORARY_LINK_METADATA_KEY,
  TemporaryLink,
} from "./temporary-link.decorator"

describe("TemporaryLinkDecorator", () => {
  describe("Given no expiresIn is provided", () => {
    class DefaultTest {
      @TemporaryLink()
      public handler(): void {}
    }

    it("should store undefined expiresIn in metadata", () => {
      const metadata = Reflect.getMetadata(
        TEMPORARY_LINK_METADATA_KEY,
        DefaultTest.prototype.handler,
      )
      expect(metadata).toMatchObject({ expiresIn: undefined })
    })

    it("should attach the TemporaryLinkInterceptor", () => {
      const interceptors = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        DefaultTest.prototype.handler,
      )
      expect(interceptors).toContain(TemporaryLinkInterceptor)
    })
  })

  describe("Given a custom expiresIn is provided", () => {
    class CustomExpiryTest {
      @TemporaryLink(600)
      public handler(): void {}
    }

    it("should store the expiresIn value in metadata", () => {
      const metadata = Reflect.getMetadata(
        TEMPORARY_LINK_METADATA_KEY,
        CustomExpiryTest.prototype.handler,
      )
      expect(metadata).toMatchObject({ expiresIn: 600 })
    })

    it("should attach the TemporaryLinkInterceptor", () => {
      const interceptors = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        CustomExpiryTest.prototype.handler,
      )
      expect(interceptors).toContain(TemporaryLinkInterceptor)
    })
  })
})
