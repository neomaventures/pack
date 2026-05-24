import { executionContext, express } from "@neoma/fixtures"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { CustomParamFactory, ExecutionContext } from "@nestjs/common/interfaces"
import { google } from "fixtures/fakes/google"

import { GetGoogleAuthResult } from "./google-auth-result.decorator"

type Args = Record<string, { factory: CustomParamFactory }>

const mockResult = google.authResult()

describe("GetGoogleAuthResultDecorator", () => {
  let decorator: typeof GetGoogleAuthResult

  beforeAll(() => {
    class GetGoogleAuthResultDecoratorTest {
      // eslint-disable-next-line
      public test(@GetGoogleAuthResult() _value: any): void {}
    }

    const args = <Args>(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        GetGoogleAuthResultDecoratorTest,
        "test",
      )
    )

    decorator = args[Object.keys(args)[0]].factory
  })

  describe("When called with a request that has googleAuthResult", () => {
    it("should return the googleAuthResult", () => {
      const context = <ExecutionContext>(
        executionContext(
          express.request({ googleAuthResult: mockResult }),
          express.response(),
        )
      )
      expect(decorator(null, context)).toEqual(mockResult)
    })
  })

  describe("When called with a request that does not have googleAuthResult", () => {
    it("should throw an Error", () => {
      const context = <ExecutionContext>(
        executionContext(express.request(), express.response())
      )
      expect(() => decorator(null, context)).toThrow(
        "GetGoogleAuthResult decorator called without googleAuthResult on the request. Did you apply @GoogleCallback() to this route?",
      )
    })
  })
})
