import { ConfigurableModuleBuilder } from "@nestjs/common"

import { BILLING_OPTIONS, type BillingModuleOptions } from "./billing.options"
import { EntitlementMapperService } from "./services/entitlement-mapper.service"
import { StripeWebhookService } from "./services/stripe-webhook.service"

const BILLING_PROVIDERS = [EntitlementMapperService, StripeWebhookService]

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<BillingModuleOptions>({
  optionsInjectionToken: BILLING_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    global: true,
    providers: [...(definition.providers ?? []), ...BILLING_PROVIDERS],
    exports: [
      ...(definition.exports ?? []),
      ...BILLING_PROVIDERS,
      BILLING_OPTIONS,
    ],
  }))
  .build()
