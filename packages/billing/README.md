# @neomaventures/billing

Stripe-backed plans, subscriptions, webhooks, and entitlement mapping for NestJS applications.

## Installation

```bash
npm install @neomaventures/billing
```

## Usage

Register the package with your Stripe webhook secret and a plan catalog. The
catalog maps Stripe prices or lookup keys to the feature flags and limits your
application already understands.

```typescript
import { BillingModule } from "@neomaventures/billing"

BillingModule.forRoot({
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  plans: {
    starter: {
      name: "Starter",
      stripePriceId: "price_starter_monthly",
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
})
```

Verify inbound Stripe webhooks against the raw request body before dispatching:

```typescript
const event = this.stripeWebhooks.constructEvent(
  req.rawBody,
  req.headers["stripe-signature"],
)
```

Resolve active subscription state into a feature-map shape that can feed
`@neomaventures/features` resolvers:

```typescript
const entitlements = this.entitlements.resolveSubscription({
  stripePriceId: subscription.items.data[0]?.price.id,
  status: subscription.status,
})

return entitlements.features
```

## Public API

- `BillingModule.forRoot(...)` / `forRootAsync(...)`
- `EntitlementMapperService` for plan, price, lookup-key, and subscription status mapping
- `StripeWebhookService` for Stripe webhook signature verification and JSON event parsing
- `BillingPlanNotFoundException`
- `StripeWebhookSignatureException`

## License

MIT
