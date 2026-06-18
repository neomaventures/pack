import { type Account } from "../entities/account.entity"
import { type Authenticatable } from "../interfaces/authenticatable.interface"
import { type AuthProvider } from "../types/auth-provider"

/**
 * Emitted after successful authentication.
 *
 * @typeParam T - The configured account entity type. Defaults to the
 *   reference {@link Account}. Consumers with a custom entity narrow at
 *   the listener site: `@OnEvent(AuthenticatedEvent.EVENT_NAME)
 *   handle(event: AuthenticatedEvent<CustomAccount>): void`.
 *
 * @example
 * ```typescript
 * @OnEvent('auth.authenticated')
 * async handleAuthenticated(event: AuthenticatedEvent) {
 *   await this.analyticsService.trackLogin(event.account.id)
 *   console.log(`Authenticated via ${event.provider}`)
 * }
 * ```
 *
 * @important Listeners should handle their own errors.
 * Unhandled errors will result in unhandled promise rejections.
 */
export class AuthenticatedEvent<T extends Authenticatable = Account> {
  public static readonly EVENT_NAME = "auth.authenticated"

  /**
   * @param account - The authenticated account
   * @param provider - The authentication provider that triggered authentication (defaults to "magic-link")
   */
  public constructor(
    public readonly account: T,
    public readonly provider: AuthProvider = "magic-link",
  ) {}
}
