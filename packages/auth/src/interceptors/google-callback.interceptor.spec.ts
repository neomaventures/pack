import { faker } from "@faker-js/faker"
import { executionContext, express } from "@neomaventures/fixtures"
import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
} from "@nestjs/common"
import { google } from "fixtures/fakes/google"
import { of } from "rxjs"

import { MissingOAuthCodeException } from "../exceptions/missing-oauth-code.exception"
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
    it("should throw MissingOAuthCodeException when the code query parameter is missing", async () => {
      const req = express.request({ query: {} })
      const res = express.response()
      const ctx = executionContext(req, res) as ExecutionContext

      await expect(
        interceptor.intercept(ctx, nextHandler),
      ).rejects.toMatchError(MissingOAuthCodeException)
    })

    it("should throw an error that is also a BadRequestException", async () => {
      const req = express.request({ query: {} })
      const res = express.response()
      const ctx = executionContext(req, res) as ExecutionContext

      await expect(
        interceptor.intercept(ctx, nextHandler),
      ).rejects.toBeInstanceOf(BadRequestException)
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
