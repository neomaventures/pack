import { Module } from "@nestjs/common"

import { ConfigurableModuleClass } from "./billing.module-definition"

/**
 * Stripe-backed billing module for NestJS applications.
 *
 * Provides plan-to-entitlement mapping plus Stripe webhook signature
 * verification primitives. Consumers keep their own persistence model while
 * using this package to normalize Stripe subscription state into application
 * feature flags and limits.
 *
 * @example
 * ```typescript
 * BillingModule.forRoot({
 *   stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
 *   plans: {
 *     pro: {
 *       name: "Pro",
 *       stripePriceId: "price_pro",
 *       features: { API_ACCESS: true },
 *       limits: { seats: 25 },
 *     },
 *   },
 * })
 * ```
 */
@Module({})
export class BillingModule extends ConfigurableModuleClass {}
