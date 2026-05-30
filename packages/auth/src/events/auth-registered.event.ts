import { type Authenticatable } from "../interfaces/authenticatable.interface"
import { type AuthProvider } from "../types/auth-provider"

/**
 * Emitted after successful registration.
 *
 * @example
 * ```typescript
 * @OnEvent('auth.registered')
 * async handleRegistered(event: AuthRegisteredEvent<User>) {
 *   await this.emailService.sendWelcome(event.entity.email)
 *   console.log(`Registered via ${event.provider}`)
 * }
 * ```
 *
 * @important Listeners should handle their own errors.
 * Unhandled errors will result in unhandled promise rejections.
 */
export class AuthRegisteredEvent<T extends Authenticatable> {
  public static readonly EVENT_NAME = "auth.registered"

  /**
   * @param entity - The newly registered entity
   * @param provider - The authentication provider that triggered registration (defaults to "magic-link")
   */
  public constructor(
    public readonly entity: T,
    public readonly provider: AuthProvider = "magic-link",
  ) {}
}
