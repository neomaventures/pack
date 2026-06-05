import { type BillingModuleOptions } from "../billing.options"
import { BillingPlanNotFoundException } from "../exceptions/billing-plan-not-found.exception"

import { EntitlementMapperService } from "./entitlement-mapper.service"

const OPTIONS: BillingModuleOptions = {
  plans: {
    starter: {
      name: "Starter",
      stripePriceId: "price_starter",
      features: {
        TEAM_MEMBERS: true,
        API_ACCESS: false,
      },
      limits: {
        seats: 3,
      },
    },
    pro: {
      name: "Pro",
      stripeLookupKey: "pro-monthly",
      features: {
        TEAM_MEMBERS: true,
        API_ACCESS: true,
      },
      limits: {
        seats: 25,
      },
    },
  },
}

describe("EntitlementMapperService", () => {
  let service: EntitlementMapperService

  beforeEach(() => {
    service = new EntitlementMapperService(OPTIONS)
  })

  it("resolves active Stripe price subscriptions to feature flags and limits", () => {
    expect(
      service.resolveSubscription({
        stripePriceId: "price_starter",
        status: "active",
      }),
    ).toEqual({
      key: "starter",
      name: "Starter",
      stripePriceId: "price_starter",
      stripeLookupKey: undefined,
      active: true,
      status: "active",
      features: {
        TEAM_MEMBERS: true,
        API_ACCESS: false,
      },
      limits: {
        seats: 3,
      },
    })
  })

  it("resolves active Stripe lookup-key subscriptions", () => {
    expect(
      service.resolveSubscription({
        stripeLookupKey: "pro-monthly",
        status: "trialing",
      }),
    ).toMatchObject({
      key: "pro",
      active: true,
      features: {
        TEAM_MEMBERS: true,
        API_ACCESS: true,
      },
      limits: {
        seats: 25,
      },
    })
  })

  it("fails closed for inactive subscriptions", () => {
    expect(
      service.resolveSubscription({
        planKey: "pro",
        status: "past_due",
      }),
    ).toMatchObject({
      key: "pro",
      active: false,
      features: {
        TEAM_MEMBERS: false,
        API_ACCESS: false,
      },
      limits: {},
    })
  })

  it("throws when no configured plan matches the Stripe price", () => {
    expect(() =>
      service.resolveSubscription({
        stripePriceId: "price_unknown",
        status: "active",
      }),
    ).toThrow(BillingPlanNotFoundException)
  })
})
