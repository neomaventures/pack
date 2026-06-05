import { createHmac, timingSafeEqual } from "crypto"

import { Inject, Injectable } from "@nestjs/common"

import { BILLING_OPTIONS, type BillingModuleOptions } from "../billing.options"
import { StripeWebhookSignatureException } from "../exceptions/stripe-webhook-signature.exception"
import {
  type StripeWebhookEvent,
  type StripeWebhookSignatureHeader,
} from "../types"

const DEFAULT_TOLERANCE_SECONDS = 300

interface ParsedStripeSignature {
  timestamp: number
  signatures: readonly string[]
}

@Injectable()
export class StripeWebhookService {
  public constructor(
    @Inject(BILLING_OPTIONS)
    private readonly options: BillingModuleOptions,
  ) {}

  public constructEvent<TData = unknown>(
    payload: Buffer | string,
    signatureHeader: StripeWebhookSignatureHeader,
  ): StripeWebhookEvent<TData> {
    this.verifySignature(payload, signatureHeader)

    const event = JSON.parse(
      this.toPayloadString(payload),
    ) as StripeWebhookEvent<TData>
    if (!event.type) {
      throw new StripeWebhookSignatureException(
        "Stripe webhook payload is missing event type",
      )
    }

    return event
  }

  public verifySignature(
    payload: Buffer | string,
    signatureHeader: StripeWebhookSignatureHeader,
  ): boolean {
    const secret = this.options.stripeWebhookSecret
    if (!secret) {
      throw new StripeWebhookSignatureException(
        "Stripe webhook secret is not configured",
      )
    }

    const parsed = this.parseSignatureHeader(signatureHeader)
    this.assertTimestampTolerance(parsed.timestamp)

    const expected = this.computeSignature(secret, parsed.timestamp, payload)
    const matched = parsed.signatures.some((signature) =>
      this.signaturesEqual(signature, expected),
    )

    if (!matched) {
      throw new StripeWebhookSignatureException()
    }

    return true
  }

  private parseSignatureHeader(
    signatureHeader: StripeWebhookSignatureHeader,
  ): ParsedStripeSignature {
    const header =
      typeof signatureHeader === "string"
        ? signatureHeader
        : signatureHeader?.join(",")

    if (!header) {
      throw new StripeWebhookSignatureException(
        "Missing stripe-signature header",
      )
    }

    const parts = header.split(",")
    const timestampPart = parts.find((part) => part.startsWith("t="))
    const signatures = parts
      .filter((part) => part.startsWith("v1="))
      .map((part) => part.slice(3))
      .filter(Boolean)

    const timestamp = Number(timestampPart?.slice(2))
    if (!Number.isFinite(timestamp) || signatures.length === 0) {
      throw new StripeWebhookSignatureException(
        "Malformed stripe-signature header",
      )
    }

    return { timestamp, signatures }
  }

  private assertTimestampTolerance(timestamp: number): void {
    const tolerance =
      this.options.webhookToleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS
    const nowSeconds = Math.floor(Date.now() / 1000)
    const drift = Math.abs(nowSeconds - timestamp)

    if (drift > tolerance) {
      throw new StripeWebhookSignatureException(
        "Stripe webhook timestamp is outside tolerance",
      )
    }
  }

  private computeSignature(
    secret: string,
    timestamp: number,
    payload: Buffer | string,
  ): string {
    return createHmac("sha256", secret)
      .update(`${timestamp}.${this.toPayloadString(payload)}`)
      .digest("hex")
  }

  private signaturesEqual(candidate: string, expected: string): boolean {
    const candidateBuffer = Buffer.from(candidate, "hex")
    const expectedBuffer = Buffer.from(expected, "hex")

    return (
      candidateBuffer.length === expectedBuffer.length &&
      timingSafeEqual(candidateBuffer, expectedBuffer)
    )
  }

  private toPayloadString(payload: Buffer | string): string {
    return Buffer.isBuffer(payload) ? payload.toString("utf8") : payload
  }
}
