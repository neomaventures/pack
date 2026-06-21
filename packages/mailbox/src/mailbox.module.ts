import {
  type DynamicModule,
  type ModuleMetadata,
  type Provider,
  type Type,
  Module,
} from "@nestjs/common"

import { GMAIL_API_BASE_URL, GMAIL_API_BASE_URL_DEFAULT } from "./constants"
import { MailAccount } from "./entities/mail-account.entity"
import { type TokenAccessor } from "./interfaces/token-accessor.interface"
import {
  type MailboxOptions,
  type ResolvedMailboxOptions,
  MAILBOX_OPTIONS,
  RESOLVED_MAILBOX_OPTIONS,
  TOKEN_ACCESSOR,
} from "./mailbox.options"
import { GmailService } from "./services/gmail.service"
import { MailboxService } from "./services/mailbox.service"

/**
 * Async-configuration shape for {@link MailboxModule.forRootAsync}.
 *
 * `tokenAccessor` is required statically (not behind the factory) because
 * mailbox registers the class via `useClass:` at module-construction time
 * so NestJS's native DI resolves the accessor's own constructor
 * dependencies. Everything else (entity, `gmailApiBaseUrl`) flows through
 * the async factory like a normal `forRootAsync`.
 */
export interface MailboxModuleAsyncOptions extends Pick<
  ModuleMetadata,
  "imports"
> {
  /**
   * Class providing a {@link TokenAccessor} implementation. Registered as a
   * provider by {@link MailboxModule} via `useClass:` so its own
   * dependencies are resolved by NestJS DI.
   */
  tokenAccessor: Type<TokenAccessor>

  /**
   * Factory producing the rest of the mailbox options. Runs after
   * `imports` resolve, so it may inject `ConfigService` or other
   * host-side providers.
   */
  useFactory: (
    ...args: any[]
  ) =>
    | Omit<MailboxOptions, "tokenAccessor">
    | Promise<Omit<MailboxOptions, "tokenAccessor">>

  /** Providers to inject into `useFactory`. */
  inject?: any[]
}

const resolveOptions = (options: MailboxOptions): ResolvedMailboxOptions => ({
  ...options,
  entity: options.entity ?? MailAccount,
  gmailApiBaseUrl: options.gmailApiBaseUrl ?? GMAIL_API_BASE_URL_DEFAULT,
})

const buildSharedProviders = (
  tokenAccessor: Type<TokenAccessor>,
): Provider[] => [
  {
    provide: RESOLVED_MAILBOX_OPTIONS,
    useFactory: (options: MailboxOptions): ResolvedMailboxOptions =>
      resolveOptions(options),
    inject: [MAILBOX_OPTIONS],
  },
  {
    provide: GMAIL_API_BASE_URL,
    useFactory: (resolved: ResolvedMailboxOptions): string =>
      resolved.gmailApiBaseUrl,
    inject: [RESOLVED_MAILBOX_OPTIONS],
  },
  { provide: TOKEN_ACCESSOR, useClass: tokenAccessor },
  GmailService,
  MailboxService,
]

const MODULE_EXPORTS = [MailboxService, MAILBOX_OPTIONS] as const

/**
 * Provider-agnostic mailbox primitive for NestJS — Gmail-first in v0.1.0.
 *
 * Exposes `MailboxService.getStats(account)`, which resolves an OAuth access
 * token via the consumer-supplied {@link TokenAccessor} class and fetches
 * Gmail label stats live (no caching).
 *
 * `MailboxModule` hand-rolls `forRoot` / `forRootAsync` rather than using
 * `ConfigurableModuleBuilder` because the consumer's `TokenAccessor` is a
 * class — registered via `useClass:` so its own constructor dependencies
 * resolve through native Nest DI without any `ModuleRef.create()` dance.
 *
 * @requires TypeOrmModule must be configured by the consumer if they need
 *   the reference `MailAccount` entity persisted — mailbox itself does not
 *   own the entity registration. See `@neomaventures/mailbox/entities`.
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
 *   tokenAccessor: AuthTokenAccessor,
 *   useFactory: (config: ConfigService) => ({
 *     gmailApiBaseUrl: config.get("GMAIL_API_BASE_URL"),
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class MailboxModule {
  /**
   * Synchronous configuration. Mirrors the route-model-binding pattern:
   * the consumer's `TokenAccessor` class is registered under `TOKEN_ACCESSOR`
   * via `useClass:` so NestJS resolves its constructor deps natively.
   *
   * @param options - Mailbox configuration. `tokenAccessor` is required;
   *   `entity` and `gmailApiBaseUrl` default to {@link MailAccount} and the
   *   production Gmail endpoint respectively.
   */
  public static forRoot(options: MailboxOptions): DynamicModule {
    return {
      module: MailboxModule,
      providers: [
        { provide: MAILBOX_OPTIONS, useValue: options },
        ...buildSharedProviders(options.tokenAccessor),
      ],
      exports: [...MODULE_EXPORTS],
    }
  }

  /**
   * Asynchronous configuration. `tokenAccessor` is required statically
   * (alongside `useFactory`) because `useClass:` needs the class reference
   * at module-construction time. Everything else flows through the async
   * factory.
   *
   * @param options - Async options shape — see {@link MailboxModuleAsyncOptions}.
   */
  public static forRootAsync(
    options: MailboxModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: MailboxModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MAILBOX_OPTIONS,
          useFactory: async (...args: unknown[]): Promise<MailboxOptions> => ({
            ...(await options.useFactory(...args)),
            tokenAccessor: options.tokenAccessor,
          }),
          inject: options.inject ?? [],
        },
        ...buildSharedProviders(options.tokenAccessor),
      ],
      exports: [...MODULE_EXPORTS],
    }
  }
}
