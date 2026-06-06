import { ConfigurableModuleBuilder } from "@nestjs/common"

import { WebhookSignatureGuard } from "./guards/webhook-signature.guard"
import { WebhookInterceptor } from "./interceptors/webhook.interceptor"
import { WEBHOOKS_OPTIONS, type WebhooksOptions } from "./webhooks.options"

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<WebhooksOptions>({
  optionsInjectionToken: WEBHOOKS_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    // global: true — guard and interceptor need DI resolution in consumer controller modules
    global: true,
    providers: [
      ...(definition.providers ?? []),
      WebhookSignatureGuard,
      WebhookInterceptor,
    ],
    exports: [
      ...(definition.exports ?? []),
      WEBHOOKS_OPTIONS,
      WebhookSignatureGuard,
      WebhookInterceptor,
    ],
  }))
  .build()
