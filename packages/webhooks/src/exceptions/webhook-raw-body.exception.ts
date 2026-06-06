import { InternalServerErrorException } from "@nestjs/common"

/**
 * Thrown when `rawBody` is not available on the incoming request.
 *
 * This indicates a server misconfiguration: the NestJS application factory
 * must be created with `rawBody: true` so that `req.rawBody` is populated
 * for webhook signature verification.
 *
 * Returns HTTP 500 Internal Server Error.
 *
 * @example
 * ```typescript
 * if (!req.rawBody) {
 *   throw new WebhookRawBodyException()
 * }
 * ```
 */
export class WebhookRawBodyException extends InternalServerErrorException {
  public constructor() {
    super(
      "rawBody is not available. Enable rawBody: true in NestFactory.create() options.",
    )
  }
}
