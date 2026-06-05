import {
  type BillingEntitlementMap,
  type BillingLimitMap,
} from "./billing.options"

export type BillingSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "unpaid"

export interface BillingPlanMatch {
  key: string
  name: string
  stripePriceId?: string
  stripeLookupKey?: string
  features: BillingEntitlementMap
  limits: BillingLimitMap
}

export interface BillingSubscriptionInput {
  planKey?: string
  stripePriceId?: string
  stripeLookupKey?: string
  status?: BillingSubscriptionStatus
}

export interface BillingEntitlementSnapshot extends BillingPlanMatch {
  active: boolean
  status?: BillingSubscriptionStatus
}

export type StripeWebhookSignatureHeader =
  | string
  | readonly string[]
  | undefined

export interface StripeWebhookEvent<TData = unknown> {
  id?: string
  type: string
  data?: TData
  created?: number
}
