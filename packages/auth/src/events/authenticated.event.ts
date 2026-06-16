import { type Account } from "../entities/account.entity"
import { type AuthProvider } from "../types/auth-provider"

/**
 * Emitted after successful authentication.
 *
 * @example
 * ```typescript
 * @OnEvent('auth.authenticated')
 * async handleAuthenticated(event: AuthenticatedEvent) {
 *   await this.analyticsService.trackLogin(event.entity.id)
 *   console.log(`Authenticated via ${event.provider}`)
 * }
 * ```
 *
 * @important Listeners should handle their own errors.
 * Unhandled errors will result in unhandled promise rejections.
 */
export class AuthenticatedEvent {
  public static readonly EVENT_NAME = "auth.authenticated"

  /**
   * @param entity - The authenticated Account
   * @param provider - The authentication provider that triggered authentication (defaults to "magic-link")
   */
  public constructor(
    public readonly entity: Account,
    public readonly provider: AuthProvider = "magic-link",
  ) {}
}
