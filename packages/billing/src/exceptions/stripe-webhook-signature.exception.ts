import { UnauthorizedException } from "@nestjs/common"

export class StripeWebhookSignatureException extends UnauthorizedException {
  public constructor(message = "Invalid Stripe webhook signature") {
    super(message)
  }
}
