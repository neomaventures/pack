import { type AuthOptions } from "../auth.options"
import { type Authenticatable } from "../interfaces/authenticatable.interface"

/**
 * Minimal {@link AuthOptions} value suitable for use in consumer unit tests.
 *
 * These options satisfy the type contract and allow Nest's DI container to
 * resolve `AuthModule.forRoot(AUTH_TEST_OPTIONS)` when a consumer feature
 * module is being unit-tested. The values are **not** intended to produce a
 * working authentication pipeline at runtime — guards, services, and mailers
 * configured from these options will fail if actually invoked.
 *
 * Use this constant in specs that exercise a consumer module which depends on
 * `AuthModule` (e.g. controllers decorated with `@Authenticated()`), but where
 * the auth pipeline itself is not under test.
 *
 * @example
 * ```typescript
 * import { AuthModule, AUTH_TEST_OPTIONS } from "@neomaventures/auth"
 *
 * const module = await Test.createTestingModule({
 *   imports: [AuthModule.forRoot(AUTH_TEST_OPTIONS), DashboardModule],
 * }).compile()
 * ```
 */
class TestAuthenticatable implements Authenticatable {
  public id = "test-id"
  public email = "test@example.com"
  public permissions: string[] = []
}

export const AUTH_TEST_OPTIONS: AuthOptions = {
  secret: "test-secret",
  expiresIn: "1h",
  entity: TestAuthenticatable,
  magicLink: {
    mailer: {
      host: "localhost",
      port: 1025,
      from: "test@example.com",
      welcome: { subject: "Welcome", html: "<p>{{token}}</p>" },
      welcomeBack: { subject: "Welcome back", html: "<p>{{token}}</p>" },
    },
  },
}
