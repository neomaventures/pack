import { executionContext, express } from "@neomaventures/fixtures"
import { type ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"

import { factories } from "../../test/factories"
import { WebhookRawBodyException } from "../exceptions/webhook-raw-body.exception"
import { WEBHOOKS_OPTIONS } from "../webhooks.options"

import { WebhookSignatureGuard } from "./webhook-signature.guard"

const TEST_SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
const SVIX_ID = "msg_2Lx0r7Gmz1lL7dK3n4y5j"
const SVIX_TIMESTAMP = "1713200000"
const BODY = JSON.stringify({ type: "user.created", data: { id: "usr_123" } })
const SIGNATURE = factories.signature(
  TEST_SECRET,
  SVIX_ID,
  SVIX_TIMESTAMP,
  BODY,
)

describe("WebhookSignatureGuard", () => {
  describe("When the request has a valid signature", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should return true", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": SIGNATURE,
          "content-type": "application/json",
        },
      })
      request.rawBody = Buffer.from(BODY)

      const ctx = executionContext(request, express.response())
      expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
    })
  })

  describe("When the signature header contains multiple signatures with one valid", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should return true", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": `v1,aW52YWxpZHNpZ25hdHVyZQ== ${SIGNATURE}`,
          "content-type": "application/json",
        },
      })
      request.rawBody = Buffer.from(BODY)

      const ctx = executionContext(request, express.response())
      expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
    })
  })

  describe("When the signature is invalid (wrong secret)", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should throw UnauthorizedException", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": factories.signature(
            factories.secret(),
            SVIX_ID,
            SVIX_TIMESTAMP,
            BODY,
          ),
          "content-type": "application/json",
        },
      })
      request.rawBody = Buffer.from(BODY)

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        { message: "Invalid webhook signature" },
      )
    })
  })

  describe("When the body has been tampered with", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should throw UnauthorizedException", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": SIGNATURE,
          "content-type": "application/json",
        },
      })
      request.rawBody = Buffer.from(JSON.stringify({ tampered: true }))

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        { message: "Invalid webhook signature" },
      )
    })
  })

  describe("When the svix-id header is missing", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should throw UnauthorizedException", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": "v1,abc",
          "content-type": "application/json",
        },
      })
      request.rawBody = Buffer.from(BODY)

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        {
          message:
            "Missing required webhook headers: svix-id, svix-timestamp, svix-signature",
        },
      )
    })
  })

  describe("When the svix-timestamp header is missing", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should throw UnauthorizedException", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-id": SVIX_ID,
          "svix-signature": "v1,abc",
          "content-type": "application/json",
        },
      })
      request.rawBody = Buffer.from(BODY)

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        {
          message:
            "Missing required webhook headers: svix-id, svix-timestamp, svix-signature",
        },
      )
    })
  })

  describe("When the svix-signature header is missing", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should throw UnauthorizedException", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "content-type": "application/json",
        },
      })
      request.rawBody = Buffer.from(BODY)

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        {
          message:
            "Missing required webhook headers: svix-id, svix-timestamp, svix-signature",
        },
      )
    })
  })

  describe("When the signature header has no v1 prefix", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should throw UnauthorizedException", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": "noprefixsignature",
          "content-type": "application/json",
        },
      })
      request.rawBody = Buffer.from(BODY)

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        UnauthorizedException,
        { message: "Invalid webhook signature" },
      )
    })
  })

  describe("When rawBody is not available on the request", () => {
    let guard: WebhookSignatureGuard

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          { provide: WEBHOOKS_OPTIONS, useValue: { secret: TEST_SECRET } },
        ],
      }).compile()

      guard = module.get(WebhookSignatureGuard)
    })

    it("then it should throw WebhookRawBodyException", () => {
      const request = express.request({
        method: "POST",
        body: JSON.parse(BODY),
        headers: {
          "svix-id": SVIX_ID,
          "svix-timestamp": SVIX_TIMESTAMP,
          "svix-signature": SIGNATURE,
          "content-type": "application/json",
        },
      })

      const ctx = executionContext(request, express.response())
      expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
        WebhookRawBodyException,
        {
          message:
            "rawBody is not available. Enable rawBody: true in NestFactory.create() options.",
        },
      )
    })
  })

  describe("When webhook secret is not provided", () => {
    it("then it should throw an Error during construction", async () => {
      await expect(
        Test.createTestingModule({
          providers: [
            WebhookSignatureGuard,
            {
              provide: WEBHOOKS_OPTIONS,
              useValue: { secret: "" },
            },
          ],
        }).compile(),
      ).rejects.toThrow(
        "WebhookSignatureGuard requires secret to be configured in WebhooksModule options.",
      )
    })
  })
})
