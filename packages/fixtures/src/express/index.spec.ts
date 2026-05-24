import crypto from "crypto"

import { type MockRequest, express } from "./index"

describe("express", () => {
  describe("cookie", () => {
    it("should sign a string value with HMAC-SHA256", () => {
      const secret = "test-secret"
      const value = "user123"

      const result = express.cookie(value, secret)

      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(value)
        .digest("base64")
        .replace(/=+$/, "")

      expect(result).toBe(
        `${encodeURIComponent("s:")}${value}.${encodeURIComponent(expectedSig)}`,
      )
    })

    it("should sign an object value with j: prefix in the signed payload", () => {
      const secret = "test-secret"
      const value = { userId: "abc" }
      const jsonValue = JSON.stringify(value)
      const signedPayload = `j:${jsonValue}`

      const result = express.cookie(value, secret)

      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("base64")
        .replace(/=+$/, "")

      expect(result).toBe(
        `${encodeURIComponent("s:")}${signedPayload}.${encodeURIComponent(expectedSig)}`,
      )
    })

    it("should return an unsigned value when no secret is provided", () => {
      const result = express.cookie("user123")
      expect(result).toBe(`${encodeURIComponent("s:")}user123`)
    })
  })

  describe("request", () => {
    it("should provide case-insensitive header access via get()", () => {
      const req = express.request({
        headers: { authorization: "Bearer token" },
      })

      expect(req.get("Authorization")).toBe("Bearer token")
      expect(req.get("authorization")).toBe("Bearer token")
    })

    it("should provide case-insensitive header access via header()", () => {
      const req = express.request({
        headers: { "content-type": "application/json" },
      })

      expect(req.header("Content-Type")).toBe("application/json")
    })

    it("should preserve extra properties passed via options", () => {
      const logger = { info: jest.fn() }
      const options: Partial<MockRequest> = { logger }
      const req = express.request(options)

      expect(req.logger).toBe(logger)
    })
  })

  describe("response", () => {
    it("should provide case-insensitive header access via get()", () => {
      const res = express.response({
        headers: { "Content-Type": "text/html" },
      })

      expect(res.get("content-type")).toBe("text/html")
      expect(res.get("Content-Type")).toBe("text/html")
    })

    it("should support mutable headers via header() and get()", () => {
      const res = express.response()

      res.header("X-Custom", "value")
      expect(res.get("x-custom")).toBe("value")
    })

    it("should support mutable headers via setHeader() and getHeader()", () => {
      const res = express.response()

      res.setHeader("X-Custom", "value")
      expect(res.getHeader("x-custom")).toBe("value")
    })

    it("should set statusCode when status() is called", () => {
      const res = express.response()

      const returned = res.status(404)

      expect(res.statusCode).toBe(404)
      expect(returned).toBe(res)
    })
  })
})
