import { Module } from "@nestjs/common"

import { ConfigurableModuleClass } from "./webhooks.module-definition"

/**
 * Webhook signature verification module for NestJS applications.
 *
 * Registers globally — `WEBHOOKS_OPTIONS` and `WebhookSignatureGuard` are
 * available to all modules without re-importing. Apply
 * `@UseGuards(WebhookSignatureGuard)` to webhook endpoints in any module.
 *
 * Requires `rawBody: true` on the NestJS application factory so that
 * `req.rawBody` is available for signature verification.
 *
 * @example Static configuration
 * ```typescript
 * WebhooksModule.forRoot({
 *   secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
 * })
 * ```
 *
 * @example Async configuration via DI
 * ```typescript
 * WebhooksModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     secret: config.get("WEBHOOK_SECRET"),
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class WebhooksModule extends ConfigurableModuleClass {}
