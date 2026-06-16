import { faker } from "@faker-js/faker"
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

import * as fakes from "../../fixtures/fakes/account"
import { setAccount } from "../account/account.slot"
import { type AuthOptions, AUTH_OPTIONS } from "../auth.options"
import { Authenticated } from "../decorators/authenticated.decorator"
import { UnauthorizedRedirectException } from "../exceptions/unauthorized-redirect.exception"

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
  let requestUrl: string
  let expectedMessage: string

  beforeEach(() => {
    requestUrl = `/${faker.lorem.slug()}/${faker.string.uuid()}`
    request = express.request({ url: requestUrl })
    expectedMessage = `Unauthenticated, access to resource ${requestUrl} denied`
  })

  describe("Given an authenticated account in the request context", () => {
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
        setAccount(fakes.account())
        expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
      })
    })
  })

  describe("Given no account in the request context", () => {
    describe("And no per-route metadata", () => {
      describe("And no module-level onUnauthenticated", () => {
        beforeEach(async () => {
          const module = await buildModule()
          guard = module.get(AuthenticatedGuard)
          cls = module.get(ClsService)
        })

        it("should throw UnauthorizedException with the resource-aware message", () => {
          const ctx = executionContext(request, express.response(), {
            controller: NoMetadataController,
            method: "handler",
          })

          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(UnauthorizedException, {
              message: expectedMessage,
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

        it("should throw UnauthorizedRedirectException for /x with 303 and the resource-aware message", () => {
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

            try {
              guard.canActivate(<ExecutionContext>ctx)
            } catch (error) {
              expect(
                (error as UnauthorizedRedirectException).getResponse(),
              ).toMatchObject({
                message: `${expectedMessage}. Redirecting to login.`,
              })
            }
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

        it("should throw the configured exception with the resource-aware message", () => {
          const ctx = executionContext(request, express.response(), {
            controller: NoMetadataController,
            method: "handler",
          })

          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(NotFoundException, {
              message: expectedMessage,
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

        it("should let route metadata win over the module-level default and carry the resource-aware message", () => {
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

            try {
              guard.canActivate(<ExecutionContext>ctx)
            } catch (error) {
              expect(
                (error as UnauthorizedRedirectException).getResponse(),
              ).toMatchObject({
                message: `${expectedMessage}. Redirecting to login.`,
              })
            }
          })
        })
      })

      describe("Given metadata is an HttpException class", () => {
        beforeEach(async () => {
          const module = await buildModule({ onUnauthenticated: "/x" })
          guard = module.get(AuthenticatedGuard)
          cls = module.get(ClsService)
        })

        it("should throw the metadata exception with the resource-aware message, not redirect to the default", () => {
          const ctx = executionContext(request, express.response(), {
            controller: ExceptionMetadataController,
            method: "handler",
          })

          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(ForbiddenException, {
              message: expectedMessage,
            })
          })
        })
      })
    })
  })
})
