import { type Account } from "../entities/account.entity"
import { type Authenticatable } from "../interfaces/authenticatable.interface"
import { type AuthProvider } from "../types/auth-provider"

/**
 * Emitted after successful registration.
 *
 * @typeParam T - The configured account entity type. Defaults to the
 *   reference {@link Account}. Consumers with a custom entity narrow at
 *   the listener site: `@OnEvent(RegisteredEvent.EVENT_NAME)
 *   handle(event: RegisteredEvent<CustomAccount>): void`.
 *
 * @example
 * ```typescript
 * @OnEvent('auth.registered')
 * async handleRegistered(event: RegisteredEvent) {
 *   await this.emailService.sendWelcome(event.account.email)
 *   console.log(`Registered via ${event.provider}`)
 * }
 * ```
 *
 * @important Listeners should handle their own errors.
 * Unhandled errors will result in unhandled promise rejections.
 */
export class RegisteredEvent<T extends Authenticatable = Account> {
  public static readonly EVENT_NAME = "auth.registered"

  /**
   * @param account - The newly registered account
   * @param provider - The authentication provider that triggered registration (defaults to "magic-link")
   */
  public constructor(
    public readonly account: T,
    public readonly provider: AuthProvider = "magic-link",
  ) {}
}
