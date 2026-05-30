import { INTERCEPTORS_METADATA } from "@nestjs/common/constants"

import { GoogleCallbackInterceptor } from "../interceptors/google-callback.interceptor"

import { GoogleCallback } from "./google-callback.decorator"

describe("GoogleCallback", () => {
  it("should apply GoogleCallbackInterceptor to the method", () => {
    class TestController {
      @GoogleCallback()
      public handleCallback(): void {}
    }

    const metadata = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      TestController.prototype.handleCallback,
    )

    expect(metadata).toContainEqual(GoogleCallbackInterceptor)
  })
})
