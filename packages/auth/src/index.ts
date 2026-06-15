import "./types/express-principal"

// Module & Configuration
export * from "./auth.module"
export * from "./auth.options"

// Entities
// `OAuthToken` is exported here as `OAuthTokenEntity` to avoid colliding
// with the existing `@OAuthToken(provider)` parameter decorator. Slice 3
// of #244 renames the decorator to `@ActiveOAuthToken` and re-exports
// the entity under its canonical name.
export { Account } from "./entities/account.entity"
export { OAuthToken as OAuthTokenEntity } from "./entities/oauth-token.entity"

// Interfaces consumers implement
export * from "./interfaces/authenticatable.interface"
export * from "./interfaces/oauth-authenticatable.interface"
export * from "./interfaces/oauth-tokenable.interface"

// Services injected via DI
export * from "./services/authentication.service"
export * from "./services/google-auth.service"
export * from "./services/magic-link.service"
export * from "./services/oauth-token.service"
export * from "./services/permission.service"
export * from "./services/session.service"
export * from "./services/token.service"

// DTO for request validation
export * from "./dtos/email.dto"

// Principal (context slot)
export { getPrincipal, CurrentPrincipal } from "./principal/principal.slot"

// Decorators used in consumer controllers
export {
  Authenticated,
  type AuthenticatedOptions,
  ON_UNAUTHENTICATED_KEY,
} from "./decorators/authenticated.decorator"
export * from "./decorators/google-auth-result.decorator"
export * from "./decorators/google-callback.decorator"
export * from "./decorators/principal.decorator"
export * from "./decorators/requires-permission.decorator"
export * from "./decorators/requires-any-permission.decorator"

// OAuth tokens
export * from "./decorators/oauth-token.decorator"
export * from "./types/oauth-provider.type"
export * from "./types/oauth-token-snapshot.type"

// Interceptors
export * from "./interceptors/google-callback.interceptor"

// Exceptions consumers may catch or reference in filters
export * from "./exceptions/email-not-verified.exception"
export * from "./exceptions/google-code-exchange.exception"
export * from "./exceptions/google-network.exception"
export * from "./exceptions/google-service.exception"
export * from "./exceptions/google-token.exception"
export * from "./exceptions/incorrect-credentials.exception"
export * from "./exceptions/invalid-credentials.exception"
export * from "./exceptions/invalid-magic-link-token.exception"
export * from "./exceptions/token-failed-verification.exception"
export * from "./exceptions/token-malformed.exception"
export * from "./exceptions/permission-denied.exception"
export * from "./exceptions/unauthorized-redirect.exception"

// Events consumers listen for via @OnEvent
export * from "./events/registered.event"
export * from "./events/authenticated.event"

// Types
export * from "./types/auth-provider"
