// Module & Configuration
export { BillingModule } from "./billing.module"
export type {
  BillingEntitlementMap,
  BillingLimitMap,
  BillingModuleOptions,
  BillingPlan,
} from "./billing.options"

// Services injected via DI
export { EntitlementMapperService } from "./services/entitlement-mapper.service"
export { StripeWebhookService } from "./services/stripe-webhook.service"

// Types used by billing consumers
export type {
  BillingEntitlementSnapshot,
  BillingPlanMatch,
  BillingSubscriptionInput,
  BillingSubscriptionStatus,
  StripeWebhookEvent,
  StripeWebhookSignatureHeader,
} from "./types"

// Exceptions
export { BillingPlanNotFoundException } from "./exceptions/billing-plan-not-found.exception"
export { StripeWebhookSignatureException } from "./exceptions/stripe-webhook-signature.exception"
