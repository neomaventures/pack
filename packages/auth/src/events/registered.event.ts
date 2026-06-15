import { type Account } from "../entities/account.entity"
import { type AuthProvider } from "../types/auth-provider"

/**
 * Emitted after successful registration.
 *
 * @example
 * ```typescript
 * @OnEvent('auth.registered')
 * async handleRegistered(event: RegisteredEvent) {
 *   await this.emailService.sendWelcome(event.entity.email)
 *   console.log(`Registered via ${event.provider}`)
 * }
 * ```
 *
 * @important Listeners should handle their own errors.
 * Unhandled errors will result in unhandled promise rejections.
 */
export class RegisteredEvent {
  public static readonly EVENT_NAME = "auth.registered"

  /**
   * @param entity - The newly registered Account
   * @param provider - The authentication provider that triggered registration (defaults to "magic-link")
   */
  public constructor(
    public readonly entity: Account,
    public readonly provider: AuthProvider = "magic-link",
  ) {}
}
