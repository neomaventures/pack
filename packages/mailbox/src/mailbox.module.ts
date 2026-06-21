import { Module } from "@nestjs/common"

import { ConfigurableModuleClass } from "./mailbox.module-definition"

/**
 * Provider-agnostic mailbox primitive for NestJS — Gmail-first in v0.1.0.
 *
 * Exposes `MailboxService.getStats(account)`, which resolves an OAuth access
 * token via the consumer-supplied {@link TokenAccessor} class and fetches
 * Gmail label stats live (no caching).
 *
 * @requires TypeOrmModule must be configured by the consumer if they need the
 *   reference `MailAccount` entity persisted — mailbox itself does not own
 *   the entity registration. See `@neomaventures/mailbox/entities`.
 *
 * @example Static configuration
 * ```typescript
 * MailboxModule.forRoot({
 *   tokenAccessor: AuthTokenAccessor,
 * })
 * ```
 *
 * @example Async configuration via DI
 * ```typescript
 * MailboxModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService): MailboxOptions => ({
 *     tokenAccessor: AuthTokenAccessor,
 *     gmailApiBaseUrl: config.get("GMAIL_API_BASE_URL"),
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class MailboxModule extends ConfigurableModuleClass {}
