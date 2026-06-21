import { ConfigurableModuleBuilder } from "@nestjs/common"

import { GMAIL_API_BASE_URL, GMAIL_API_BASE_URL_DEFAULT } from "./constants"
import { MailAccount } from "./entities/mail-account.entity"
import {
  type MailboxOptionsBase,
  type ResolvedMailboxOptions,
  MAILBOX_OPTIONS,
  RESOLVED_MAILBOX_OPTIONS,
} from "./mailbox.options"
import { GmailService } from "./services/gmail.service"
import { MailboxService } from "./services/mailbox.service"

const MAILBOX_PROVIDERS = [GmailService, MailboxService]

const MAILBOX_EXPORTS = [MailboxService, MAILBOX_OPTIONS] as const

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<MailboxOptionsBase>({
  optionsInjectionToken: MAILBOX_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    providers: [
      ...(definition.providers ?? []),
      ...MAILBOX_PROVIDERS,
      {
        provide: RESOLVED_MAILBOX_OPTIONS,
        useFactory: (options: MailboxOptionsBase): ResolvedMailboxOptions => ({
          ...options,
          entity: options.entity ?? MailAccount,
          gmailApiBaseUrl:
            options.gmailApiBaseUrl ?? GMAIL_API_BASE_URL_DEFAULT,
        }),
        inject: [MAILBOX_OPTIONS],
      },
      {
        provide: GMAIL_API_BASE_URL,
        useFactory: (resolved: ResolvedMailboxOptions): string =>
          resolved.gmailApiBaseUrl,
        inject: [RESOLVED_MAILBOX_OPTIONS],
      },
    ],
    exports: [...(definition.exports ?? []), ...MAILBOX_EXPORTS],
  }))
  .build()
