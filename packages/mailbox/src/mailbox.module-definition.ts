import { ConfigurableModuleBuilder } from "@nestjs/common"

import { GMAIL_API_BASE_URL, GMAIL_API_BASE_URL_DEFAULT } from "./constants"
import { MailAccount } from "./entities/mail-account.entity"
import {
  type MailboxOptions,
  type ResolvedMailboxOptions,
  MAILBOX_OPTIONS,
  RESOLVED_MAILBOX_OPTIONS,
} from "./mailbox.options"
import { GmailService } from "./services/gmail.service"
import { MailboxService } from "./services/mailbox.service"

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<MailboxOptions>({
  optionsInjectionToken: MAILBOX_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    // Not global — mailbox has a single feature-shaped service surface
    // consumed by one host controller. Auth and storage are global because
    // their slot/credential providers are app-wide singletons; mailbox has
    // neither.
    global: false,
    providers: [
      ...(definition.providers ?? []),
      {
        provide: RESOLVED_MAILBOX_OPTIONS,
        useFactory: (options: MailboxOptions): ResolvedMailboxOptions => ({
          ...options,
          entity: options.entity ?? MailAccount,
          gmailApiBaseUrl:
            options.gmailApiBaseUrl ?? GMAIL_API_BASE_URL_DEFAULT,
        }),
        inject: [MAILBOX_OPTIONS],
      },
      // GmailService reads the (defaulted) gmail API base URL from the
      // resolved options. Done via its own provider so GmailService
      // continues to inject GMAIL_API_BASE_URL directly (see its
      // constructor) — keeps GmailService unaware of the resolved-options
      // token, which is a mailbox-module concern.
      {
        provide: GMAIL_API_BASE_URL,
        useFactory: (resolved: ResolvedMailboxOptions): string =>
          resolved.gmailApiBaseUrl,
        inject: [RESOLVED_MAILBOX_OPTIONS],
      },
      GmailService,
      MailboxService,
    ],
    // MAILBOX_OPTIONS is exported so consumers can inject the raw config
    // if they need it; MailboxService is the primary public surface.
    exports: [...(definition.exports ?? []), MailboxService, MAILBOX_OPTIONS],
  }))
  .build()
