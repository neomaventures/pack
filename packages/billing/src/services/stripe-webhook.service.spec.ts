import { createHmac } from "crypto"

import { type BillingModuleOptions } from "../billing.options"
import { StripeWebhookSignatureException } from "../exceptions/stripe-webhook-signature.exception"

import { StripeWebhookService } from "./stripe-webhook.service"

const SECRET = "whsec_test_secret"
const PAYLOAD = JSON.stringify({
  id: "evt_123",
  type: "customer.subscription.updated",
  data: {
    object: {
      id: "sub_123",
    },
  },
})

const sign = (payload: string, timestamp: number, secret = SECRET): string => {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex")
  return `t=${timestamp},v1=${signature}`
}

const options = (
  overrides: Partial<BillingModuleOptions> = {},
): BillingModuleOptions => ({
  plans: {},
  stripeWebhookSecret: SECRET,
  webhookToleranceSeconds: 300,
  ...overrides,
})

describe("StripeWebhookService", () => {
  it("constructs an event when the Stripe signature is valid", () => {
    const timestamp = Math.floor(Date.now() / 1000)
    const service = new StripeWebhookService(options())

    expect(service.constructEvent(PAYLOAD, sign(PAYLOAD, timestamp))).toEqual({
      id: "evt_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
        },
      },
    })
  })

  it("accepts one valid v1 signature among multiple candidates", () => {
    const timestamp = Math.floor(Date.now() / 1000)
    const validHeader = sign(PAYLOAD, timestamp)
    const header = `t=${timestamp},v1=deadbeef,${validHeader.split(",")[1]}`
    const service = new StripeWebhookService(options())

    expect(service.verifySignature(Buffer.from(PAYLOAD), header)).toBe(true)
  })

  it("rejects a tampered payload", () => {
    const timestamp = Math.floor(Date.now() / 1000)
    const service = new StripeWebhookService(options())

    expect(() =>
      service.verifySignature(
        JSON.stringify({ type: "customer.deleted" }),
        sign(PAYLOAD, timestamp),
      ),
    ).toThrow(StripeWebhookSignatureException)
  })

  it("rejects stale webhook timestamps", () => {
    const timestamp = Math.floor(Date.now() / 1000) - 301
    const service = new StripeWebhookService(options())

    expect(() =>
      service.verifySignature(PAYLOAD, sign(PAYLOAD, timestamp)),
    ).toThrow(StripeWebhookSignatureException)
  })

  it("rejects missing webhook secrets", () => {
    const timestamp = Math.floor(Date.now() / 1000)
    const service = new StripeWebhookService(
      options({ stripeWebhookSecret: undefined }),
    )

    expect(() =>
      service.verifySignature(PAYLOAD, sign(PAYLOAD, timestamp)),
    ).toThrow(StripeWebhookSignatureException)
  })
})
