import { Inject, Injectable } from "@nestjs/common"

import {
  BILLING_OPTIONS,
  type BillingEntitlementMap,
  type BillingLimitMap,
  type BillingModuleOptions,
  type BillingPlan,
} from "../billing.options"
import { BillingPlanNotFoundException } from "../exceptions/billing-plan-not-found.exception"
import {
  type BillingEntitlementSnapshot,
  type BillingPlanMatch,
  type BillingSubscriptionInput,
  type BillingSubscriptionStatus,
} from "../types"

const ENTITLED_STATUSES = new Set<BillingSubscriptionStatus>([
  "active",
  "trialing",
])

@Injectable()
export class EntitlementMapperService {
  public constructor(
    @Inject(BILLING_OPTIONS)
    private readonly options: BillingModuleOptions,
  ) {}

  public getPlan(planKey: string): BillingPlanMatch {
    const plan = this.options.plans[planKey]
    if (!plan) {
      throw new BillingPlanNotFoundException(planKey)
    }

    return this.toMatch(planKey, plan)
  }

  public findPlan(
    input: BillingSubscriptionInput,
  ): BillingPlanMatch | undefined {
    if (input.planKey) {
      return this.getPlan(input.planKey)
    }

    const entries = Object.entries(this.options.plans)
    const match = entries.find(([, plan]) => {
      if (input.stripePriceId && plan.stripePriceId === input.stripePriceId) {
        return true
      }

      return Boolean(
        input.stripeLookupKey && plan.stripeLookupKey === input.stripeLookupKey,
      )
    })

    if (!match) return undefined

    const [key, plan] = match
    return this.toMatch(key, plan)
  }

  public resolveSubscription(
    input: BillingSubscriptionInput,
  ): BillingEntitlementSnapshot {
    const match = this.findPlan(input)
    const identifier =
      input.planKey ?? input.stripePriceId ?? input.stripeLookupKey ?? "unknown"

    if (!match) {
      throw new BillingPlanNotFoundException(identifier)
    }

    const active = this.isEntitled(input.status)

    return {
      ...match,
      active,
      status: input.status,
      features: active ? match.features : this.disable(match.features),
      limits: active ? match.limits : {},
    }
  }

  public featuresForPlan(planKey: string): BillingEntitlementMap {
    return { ...this.getPlan(planKey).features }
  }

  public limitsForPlan(planKey: string): BillingLimitMap {
    return { ...this.getPlan(planKey).limits }
  }

  public isEntitled(status: BillingSubscriptionStatus | undefined): boolean {
    return status ? ENTITLED_STATUSES.has(status) : true
  }

  private toMatch(key: string, plan: BillingPlan): BillingPlanMatch {
    return {
      key,
      name: plan.name,
      stripePriceId: plan.stripePriceId,
      stripeLookupKey: plan.stripeLookupKey,
      features: { ...(plan.features ?? {}) },
      limits: { ...(plan.limits ?? {}) },
    }
  }

  private disable(features: BillingEntitlementMap): BillingEntitlementMap {
    return Object.fromEntries(
      Object.keys(features).map((feature) => [feature, false]),
    )
  }
}
