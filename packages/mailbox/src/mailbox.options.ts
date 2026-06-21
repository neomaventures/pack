import { type Mailboxable } from "./interfaces/mailboxable.interface"
import { type TokenAccessor } from "./interfaces/token-accessor.interface"

/**
 * Public DI token carrying the raw {@link MailboxOptions} as provided by the
 * consumer. Mirrors the `AUTH_OPTIONS` shape — exported so consumers (or
 * downstream packages) can inject the configuration if needed.
 */
export const MAILBOX_OPTIONS = Symbol("MAILBOX_OPTIONS")

/**
 * Package-internal token carrying the fully-resolved mailbox options —
 * `entity` and `gmailApiBaseUrl` are materialised to their concrete defaults
 * (`MailAccount` / `https://gmail.googleapis.com`) when consumers omit them.
 *
 * Not exported from the package's public barrel. Services inside the package
 * inject this token instead of {@link MAILBOX_OPTIONS} when they need the
 * defaulted values.
 */
export const RESOLVED_MAILBOX_OPTIONS = Symbol("RESOLVED_MAILBOX_OPTIONS")

/**
 * Package-internal DI token resolving the consumer's {@link TokenAccessor}
 * class. `MailboxModule` registers the consumer-supplied class under this
 * token via `useClass:` so NestJS's native DI resolves the accessor's own
 * constructor dependencies — no `ModuleRef.create()`, no `onModuleInit`.
 *
 * Not exported from the public barrel. `MailboxService` injects this token
 * rather than the consumer's concrete class so the consumer's type never
 * leaks into the service signature.
 */
export const TOKEN_ACCESSOR = Symbol("TOKEN_ACCESSOR")

/**
 * Configuration options for {@link MailboxModule}.
 *
 * @example Minimal — defaults `entity` to `MailAccount` and `gmailApiBaseUrl`
 *   to the production Gmail endpoint
 * ```typescript
 * MailboxModule.forRoot({
 *   tokenAccessor: AuthTokenAccessor,
 * })
 * ```
 *
 * @example Custom entity + test base URL
 * ```typescript
 * MailboxModule.forRoot({
 *   tokenAccessor: AuthTokenAccessor,
 *   entity: CustomMailAccount,
 *   gmailApiBaseUrl: "http://localhost:1080",
 * })
 * ```
 */
export interface MailboxOptions<T extends Mailboxable = Mailboxable> {
  /**
   * Class providing a {@link TokenAccessor} implementation. Registered as a
   * provider by {@link MailboxModule} and injected into `MailboxService`.
   *
   * The class itself is constructor-injected, so async wiring of its own
   * dependencies (e.g. a host-side `OAuthTokenService`) works naturally via
   * standard NestJS DI.
   */
  tokenAccessor: new (...args: any[]) => TokenAccessor

  /**
   * Custom entity class implementing {@link Mailboxable}. Defaults to the
   * reference `MailAccount` entity shipped from
   * `@neomaventures/mailbox/entities`.
   *
   * Supplying a custom class lets consumers add columns, relations, or
   * methods while keeping the package's service surface unchanged.
   */
  entity?: new (...args: any[]) => T

  /**
   * Gmail API base URL. Defaults to `https://gmail.googleapis.com`.
   *
   * @warning This should not be overridden in production. It exists for
   * testing purposes (e.g. pointing to a mockserver).
   */
  gmailApiBaseUrl?: string
}

/**
 * Fields of {@link MailboxOptions} that are routed through the underlying
 * `ConfigurableModuleBuilder` — everything except `tokenAccessor`, which is
 * resolved separately as a class-based provider by the module overrides.
 */
export type MailboxOptionsBase<T extends Mailboxable = Mailboxable> = Omit<
  MailboxOptions<T>,
  "tokenAccessor"
>

/**
 * Fully-resolved mailbox options exposed via {@link RESOLVED_MAILBOX_OPTIONS}.
 * Mirrors {@link MailboxOptions} but with `entity` and `gmailApiBaseUrl`
 * materialised to their concrete defaults so service code never sees
 * `undefined`.
 *
 * Package-internal — not exported from the public barrel.
 */
export type ResolvedMailboxOptions<T extends Mailboxable = Mailboxable> =
  MailboxOptionsBase<T> & {
    entity: new (...args: any[]) => T
    gmailApiBaseUrl: string
  }
