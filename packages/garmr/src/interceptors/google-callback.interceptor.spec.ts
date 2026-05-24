import { faker } from "@faker-js/faker"
import { executionContext, express } from "@neoma/fixtures"
import { type CallHandler, type ExecutionContext } from "@nestjs/common"
import { google } from "fixtures/fakes/google"
import { of } from "rxjs"

import { GoogleCodeExchangeException } from "../exceptions/google-code-exchange.exception"
import { type GoogleAuthService } from "../services/google-auth.service"

import { GoogleCallbackInterceptor } from "./google-callback.interceptor"

describe("GoogleCallbackInterceptor", () => {
  const mockAuthResult = google.authResult()

  const mockGoogleAuthService = {
    authenticate: jest.fn(),
  }

  const nextHandler: CallHandler = {
    handle: jest.fn().mockReturnValue(of(undefined)),
  }

  let interceptor: GoogleCallbackInterceptor

  beforeEach(() => {
    interceptor = new GoogleCallbackInterceptor(
      mockGoogleAuthService as unknown as GoogleAuthService,
    )
    jest.clearAllMocks()
  })

  describe("Given missing code query param", () => {
    it("should throw GoogleCodeExchangeException with reason 'missing code query parameter'", async () => {
      const req = express.request({ query: {} })
      const res = express.response()
      const ctx = executionContext(req, res) as ExecutionContext

      await expect(
        interceptor.intercept(ctx, nextHandler),
      ).rejects.toMatchError(GoogleCodeExchangeException, {
        reason: "missing code query parameter",
      })
    })
  })

  describe("Given valid code", () => {
    it("should authenticate with the code, attach result to request, and call next", async () => {
      const code = faker.string.alphanumeric(20)
      const req = express.request({ query: { code } })
      const res = express.response()
      const ctx = executionContext(req, res) as ExecutionContext

      mockGoogleAuthService.authenticate.mockImplementation(
        (receivedCode: string) => {
          expect(receivedCode).toBe(code)
          return Promise.resolve(mockAuthResult)
        },
      )

      await interceptor.intercept(ctx, nextHandler)

      expect(req.googleAuthResult).toBe(mockAuthResult)
      expect(nextHandler.handle).toHaveBeenCalledWith()
    })
  })
})
