import {
  executionContext,
  express,
  type MockRequest,
} from "@neomaventures/fixtures"
import { RequestContextModule } from "@neomaventures/request-context"
import {
  type ExecutionContext,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import * as fakes from "../../fixtures/fakes/principal"
import { UnauthorizedRedirectException } from "../exceptions/unauthorized-redirect.exception"
import { setPrincipal } from "../principal/principal.slot"

import { Authenticated } from "./authenticated.guard"

describe("Authenticated", () => {
  let cls: ClsService

  describe("Without a redirect URL", () => {
    let guard: Authenticated

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [RequestContextModule.forRoot()],
        providers: [Authenticated],
      }).compile()

      guard = module.get(Authenticated)
      cls = module.get(ClsService)
    })

    describe("canActivate", () => {
      let request: MockRequest
      let ctx: Partial<ExecutionContext>
      beforeEach(() => {
        request = express.request()
        ctx = executionContext(request, express.response())
      })

      describe(`When it is called with a request with no current principal`, () => {
        it("Then it should throw an UnauthorizedException.", () => {
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

      describe(`When it is called with a request with an attached principal`, () => {
        it("Then it should return true.", () => {
          cls.run(() => {
            setPrincipal(fakes.principal())
            expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
          })
        })
      })
    })
  })

  describe("With a redirect URL", () => {
    const redirectUrl = "/auth/magic-link"
    let guard: Authenticated

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [RequestContextModule.forRoot()],
      }).compile()

      cls = module.get(ClsService)
      // TODO : Can we decorate a class or function and grab the Authenticated instance from it to avoid this new?
      guard = new Authenticated(redirectUrl)
    })

    describe("canActivate", () => {
      let request: MockRequest
      let ctx: Partial<ExecutionContext>
      beforeEach(() => {
        request = express.request()
        ctx = executionContext(request, express.response())
      })

      describe(`When it is called with a request with no current principal`, () => {
        it("Then it should throw an UnauthorizedRedirectException.", () => {
          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(UnauthorizedRedirectException, {
              message: "Unauthorized. Redirecting to login.",
            })
          })
        })

        it("Then the exception should have a redirect with the URL and 303 status.", () => {
          cls.run(() => {
            expect(() =>
              guard.canActivate(<ExecutionContext>ctx),
            ).toThrowMatching(UnauthorizedRedirectException, {
              url: redirectUrl,
              redirectStatus: HttpStatus.SEE_OTHER,
            })
          })
        })
      })

      describe(`When it is called with a request with an attached principal`, () => {
        it("Then it should return true.", () => {
          cls.run(() => {
            setPrincipal(fakes.principal())
            expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
          })
        })
      })
    })
  })
})
