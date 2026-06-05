/**
 * Injection token for billing module options.
 *
 * @internal Used by the module builder and services.
 */
export const BILLING_OPTIONS = Symbol("BILLING_OPTIONS")

export type BillingEntitlementMap = Record<string, boolean>

export type BillingLimitMap = Record<string, number>

export interface BillingPlan {
  /**
   * Human-readable plan name for logs, dashboards, and customer-facing labels.
   */
  name: string

  /**
   * Stripe price id, for example `price_...`.
   *
   * Either `stripePriceId` or `stripeLookupKey` should be set when this plan is
   * resolved from live Stripe subscription items.
   */
  stripePriceId?: string

  /**
   * Stripe price lookup key, for example `pro-monthly`.
   */
  stripeLookupKey?: string

  /**
   * Feature flags enabled while a subscription to this plan is active.
   *
   * The shape intentionally mirrors `@neomaventures/features` resolver output.
   */
  features?: BillingEntitlementMap

  /**
   * Numeric plan limits such as seats, API calls, projects, or storage.
   */
  limits?: BillingLimitMap
}

export interface BillingModuleOptions {
  /**
   * Stripe endpoint secret used to verify `stripe-signature`.
   */
  stripeWebhookSecret?: string

  /**
   * Maximum accepted difference between the Stripe header timestamp and local
   * time. Defaults to 300 seconds, matching Stripe's SDK default.
   */
  webhookToleranceSeconds?: number

  /**
   * Application plan catalog keyed by the application's stable plan key.
   */
  plans: Record<string, BillingPlan>
}
