import { type DynamicModule, type Type, Module } from "@nestjs/common"

import { type TokenAccessor } from "./interfaces/token-accessor.interface"
import {
  type ASYNC_OPTIONS_TYPE,
  type OPTIONS_TYPE,
  ConfigurableModuleClass,
} from "./mailbox.module-definition"
import { TOKEN_ACCESSOR } from "./mailbox.options"

/**
 * Synchronous options for {@link MailboxModule.forRoot}. Extends the
 * `ConfigurableModuleBuilder`-generated plain-data shape with the consumer's
 * `tokenAccessor` class, which is registered via `useClass:` by the override.
 */
export type MailboxModuleOptions = typeof OPTIONS_TYPE & {
  tokenAccessor: Type<TokenAccessor>
}

/**
 * Async-configuration shape for {@link MailboxModule.forRootAsync}.
 *
 * `tokenAccessor` is required statically (not behind the factory) because
 * mailbox registers the class via `useClass:` at module-construction time
 * so NestJS's native DI resolves the accessor's own constructor
 * dependencies. Everything else (`gmailApiBaseUrl`) flows through the
 * async factory like a normal `forRootAsync`.
 */
export type MailboxModuleAsyncOptions = typeof ASYNC_OPTIONS_TYPE & {
  tokenAccessor: Type<TokenAccessor>
}

/**
 * Provider-agnostic mailbox primitive for NestJS — Gmail-first in v0.1.0.
 *
 * Exposes `MailboxService.getStats()`, which resolves an OAuth access token
 * via the consumer-supplied {@link TokenAccessor} class and fetches Gmail
 * label stats live (no caching). Mailbox is account-agnostic — the accessor
 * resolves "for whom" internally via ambient request context.
 *
 * Built on `ConfigurableModuleBuilder` for the plain-data plumbing
 * (`gmailApiBaseUrl`), with thin `forRoot` / `forRootAsync` overrides that
 * extract the consumer's `tokenAccessor` class and append it as a
 * `useClass:` provider so its own constructor dependencies resolve through
 * native Nest DI — no `ModuleRef.create()` dance.
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
// `ConfigurableModuleClass`'s generated `forRoot` / `forRootAsync` accept the
// plain-data `MailboxOptionsBase`. Our overrides narrow the input type to
// require `tokenAccessor` as well, which TypeScript flags as an unsafe
// static-side override (TS2417). The runtime behaviour is sound — overrides
// destructure `tokenAccessor` out and pass the plain-data rest to
// `super.forRoot` / `super.forRootAsync` — so we suppress the structural check
// on the class declaration.
@Module({})
// @ts-expect-error TS2417: intentional input-narrowing override
export class MailboxModule extends ConfigurableModuleClass {
  /**
   * Synchronous configuration. The consumer's `TokenAccessor` class is
   * registered under `TOKEN_ACCESSOR` via `useClass:` so NestJS resolves its
   * constructor deps natively.
   */
  public static override forRoot(options: MailboxModuleOptions): DynamicModule {
    const { tokenAccessor, ...rest } = options
    const base = super.forRoot(rest)
    return {
      ...base,
      providers: [
        ...(base.providers ?? []),
        { provide: TOKEN_ACCESSOR, useClass: tokenAccessor },
      ],
    }
  }

  /**
   * Asynchronous configuration. `tokenAccessor` is required statically
   * (alongside `useFactory`) because `useClass:` needs the class reference
   * at module-construction time. Everything else flows through the async
   * factory.
   */
  public static override forRootAsync(
    options: MailboxModuleAsyncOptions,
  ): DynamicModule {
    const { tokenAccessor, ...rest } = options
    const base = super.forRootAsync(rest)
    return {
      ...base,
      providers: [
        ...(base.providers ?? []),
        { provide: TOKEN_ACCESSOR, useClass: tokenAccessor },
      ],
    }
  }
}
