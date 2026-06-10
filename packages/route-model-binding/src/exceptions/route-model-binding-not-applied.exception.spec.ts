import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { RouteModelBindingNotAppliedException } from "./route-model-binding-not-applied.exception"

describe("RouteModelBindingNotAppliedException", () => {
  describe("Given a paramName", () => {
    const paramName = faker.lorem.word()
    let exception: RouteModelBindingNotAppliedException

    beforeEach(() => {
      exception = new RouteModelBindingNotAppliedException(paramName)
    })

    it("should expose the paramName property", () => {
      expect(exception.paramName).toBe(paramName)
    })

    it("should return HTTP 500", () => {
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    })

    it("should include statusCode, message, paramName and error in the response body", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: expect.any(String),
        paramName,
        error: "Internal Server Error",
      })
    })

    it("should mention the param name in the message", () => {
      const response = exception.getResponse() as { message: string }
      expect(response.message).toContain(`"${paramName}"`)
    })

    it("should mention RouteModelBindingMiddleware in the message", () => {
      const response = exception.getResponse() as { message: string }
      expect(response.message).toContain("RouteModelBindingMiddleware")
    })
  })
})
