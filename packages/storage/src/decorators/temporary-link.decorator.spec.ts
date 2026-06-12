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

    it("should store empty options in metadata", () => {
      const metadata = Reflect.getMetadata(
        TEMPORARY_LINK_METADATA_KEY,
        DefaultTest.prototype.handler,
      )
      expect(metadata).toEqual({})
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

  describe("Given an options object with expiresIn is provided", () => {
    class OptionsExpiryTest {
      @TemporaryLink({ expiresIn: 600 })
      public handler(): void {}
    }

    class ShorthandExpiryTest {
      @TemporaryLink(600)
      public handler(): void {}
    }

    it("should produce identical metadata to the shorthand form", () => {
      const optionsMetadata = Reflect.getMetadata(
        TEMPORARY_LINK_METADATA_KEY,
        OptionsExpiryTest.prototype.handler,
      )
      const shorthandMetadata = Reflect.getMetadata(
        TEMPORARY_LINK_METADATA_KEY,
        ShorthandExpiryTest.prototype.handler,
      )
      expect(optionsMetadata).toEqual(shorthandMetadata)
    })
  })

  describe("Given an options object with a default URL is provided", () => {
    const defaultUrl = "/img/default.svg"

    class DefaultUrlTest {
      @TemporaryLink({ default: defaultUrl })
      public handler(): void {}
    }

    it("should store the default URL in metadata", () => {
      const metadata = Reflect.getMetadata(
        TEMPORARY_LINK_METADATA_KEY,
        DefaultUrlTest.prototype.handler,
      )
      expect(metadata).toMatchObject({ default: defaultUrl })
    })

    it("should attach the TemporaryLinkInterceptor", () => {
      const interceptors = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        DefaultUrlTest.prototype.handler,
      )
      expect(interceptors).toContain(TemporaryLinkInterceptor)
    })
  })
})
