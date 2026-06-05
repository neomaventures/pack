import { ConfigurableModuleBuilder } from "@nestjs/common"

import { WebhookSignatureGuard } from "./guards/webhook-signature.guard"
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
    providers: [...(definition.providers ?? []), WebhookSignatureGuard],
    exports: [...(definition.exports ?? []), WEBHOOKS_OPTIONS],
  }))
  .build()
