import {
  executionContext,
  express,
  type MockRequest,
} from "@neomaventures/fixtures"
import { RequestContextModule } from "@neomaventures/request-context"
import {
  type ExecutionContext,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import * as fakes from "../../fixtures/fakes/principal"
import { type AuthOptions, AUTH_OPTIONS } from "../auth.options"
import { Authenticated } from "../decorators/authenticated.decorator"
import { UnauthorizedRedirectException } from "../exceptions/unauthorized-redirect.exception"
import { setPrincipal } from "../principal/principal.slot"

import { AuthenticatedGuard } from "./authenticated.guard"

// A bare controller with no @Authenticated metadata — used for tests that
// exercise the module-level default path.
class NoMetadataController {
  public handler(): void {}
}

// Routes that stamp per-route metadata via the decorator. We exercise the
// guard against the resolved handler/class pair to drive Reflector reads.
class RedirectMetadataController {
  @Authenticated({ onUnauthenticated: "/y" })
  public handler(): void {}
}

class ExceptionMetadataController {
  @Authenticated({ onUnauthenticated: ForbiddenException })
  public handler(): void {}
}

const buildModule = async (
  options: Partial<AuthOptions> = {},
): Promise<TestingModule> =>
  Test.createTestingModule({
    imports: [RequestContextModule.forRoot()],
    providers: [
      AuthenticatedGuard,
      Reflector,
      { provide: AUTH_OPTIONS, useValue: options as AuthOptions },
    ],
  }).compile()

describe("AuthenticatedGuard", () => {
  let guard: AuthenticatedGuard
  let cls: ClsService
  let request: MockRequest

  beforeEach(() => {
    request = express.request()
  })

  describe("Given an authenticated principal in the request context", () => {
    beforeEach(async () => {
      const module = await buildModule()
      guard = module.get(AuthenticatedGuard)
      cls = module.get(ClsService)
    })

    it("should return true regardless of metadata or module options", () => {
      const ctx = executionContext(request, express.response(), {
        controller: NoMetadataController,
        method: "handler",
      })

      cls.run(() => {
        setPrincipal(fakes.principal())
        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })
    })
  })

  describe("Given no principal in the request context", () => {
    describe("And no per-route metadata", () => {
      describe("And no module-level onUnauthenticated", () => {
        beforeEach(async () => {
          const module = await buildModule()
          guard = module.get(AuthenticatedGuard)
          cls = module.get(ClsService)
        })

        it("should throw UnauthorizedException with the documented message", () => {
          const ctx = executionContext(request, express.response(), {
            controller: NoMetadataController,
            method: "handler",
          })

          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(UnauthorizedException, {
              message:
                "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
            })
          })
        })
      })

      describe("And module-level onUnauthenticated is a redirect string", () => {
        beforeEach(async () => {
          const module = await buildModule({ onUnauthenticated: "/x" })
          guard = module.get(AuthenticatedGuard)
          cls = module.get(ClsService)
        })

        it("should throw UnauthorizedRedirectException for /x with 303", () => {
          const ctx = executionContext(request, express.response(), {
            controller: NoMetadataController,
            method: "handler",
          })

          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(UnauthorizedRedirectException, {
              url: "/x",
              redirectStatus: HttpStatus.SEE_OTHER,
            })
          })
        })
      })

      describe("And module-level onUnauthenticated is an HttpException class", () => {
        beforeEach(async () => {
          const module = await buildModule({
            onUnauthenticated: NotFoundException,
          })
          guard = module.get(AuthenticatedGuard)
          cls = module.get(ClsService)
        })

        it("should throw the configured exception with the access-denied message", () => {
          const ctx = executionContext(request, express.response(), {
            controller: NoMetadataController,
            method: "handler",
          })

          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(NotFoundException, {
              message: "Request unauthenticated — access denied",
            })
          })
        })
      })
    })

    describe("And per-route metadata is supplied", () => {
      describe("Given metadata is a redirect string", () => {
        beforeEach(async () => {
          const module = await buildModule({ onUnauthenticated: "/x" })
          guard = module.get(AuthenticatedGuard)
          cls = module.get(ClsService)
        })

        it("should let route metadata win over the module-level default", () => {
          const ctx = executionContext(request, express.response(), {
            controller: RedirectMetadataController,
            method: "handler",
          })

          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(UnauthorizedRedirectException, {
              url: "/y",
              redirectStatus: HttpStatus.SEE_OTHER,
            })
          })
        })
      })

      describe("Given metadata is an HttpException class", () => {
        beforeEach(async () => {
          const module = await buildModule({ onUnauthenticated: "/x" })
          guard = module.get(AuthenticatedGuard)
          cls = module.get(ClsService)
        })

        it("should throw the metadata exception, not redirect to the default", () => {
          const ctx = executionContext(request, express.response(), {
            controller: ExceptionMetadataController,
            method: "handler",
          })

          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(ForbiddenException, {
              message: "Request unauthenticated — access denied",
            })
          })
        })
      })
    })
  })
})
