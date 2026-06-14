import {
  ForbiddenException,
  NotFoundException,
  type Type,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { type OnUnauthenticated } from "../auth.options"

import {
  Authenticated,
  ON_UNAUTHENTICATED_KEY,
} from "./authenticated.decorator"

describe("@Authenticated()", () => {
  const reflector = new Reflector()

  describe("When called without options", () => {
    class NoOptionsController {
      @Authenticated()
      public handler(): void {}
    }

    it("should stamp undefined under the on-unauthenticated metadata key", () => {
      const metadata = reflector.get<OnUnauthenticated | undefined>(
        ON_UNAUTHENTICATED_KEY,
        NoOptionsController.prototype.handler,
      )

      expect(metadata).toBeUndefined()
    })
  })

  describe("When called with a redirect string", () => {
    class RedirectController {
      @Authenticated({ onUnauthenticated: "/login" })
      public handler(): void {}
    }

    it("should stamp the URL under the on-unauthenticated metadata key", () => {
      const metadata = reflector.get<OnUnauthenticated | undefined>(
        ON_UNAUTHENTICATED_KEY,
        RedirectController.prototype.handler,
      )

      expect(metadata).toBe("/login")
    })
  })

  describe("When called with an exception class", () => {
    class ExceptionController {
      @Authenticated({ onUnauthenticated: NotFoundException })
      public handler(): void {}
    }

    it("should stamp the exception class under the on-unauthenticated metadata key", () => {
      const metadata = reflector.get<OnUnauthenticated | undefined>(
        ON_UNAUTHENTICATED_KEY,
        ExceptionController.prototype.handler,
      )

      expect(metadata).toBe(NotFoundException)
    })
  })

  describe("When applied at the class level", () => {
    @Authenticated({ onUnauthenticated: ForbiddenException })
    class ClassController {
      public handler(): void {}
    }

    it("should stamp metadata on the class itself", () => {
      const metadata = reflector.get<OnUnauthenticated | undefined>(
        ON_UNAUTHENTICATED_KEY,
        ClassController as Type<unknown>,
      )

      expect(metadata).toBe(ForbiddenException)
    })
  })
})
