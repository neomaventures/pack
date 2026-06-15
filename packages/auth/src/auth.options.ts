import { type HttpException } from "@nestjs/common"
import type * as jwt from "jsonwebtoken"

import { type Authenticatable } from "./interfaces/authenticatable.interface"
import { type OAuthTokenable } from "./interfaces/oauth-tokenable.interface"

export const AUTH_OPTIONS = Symbol("AUTH_OPTIONS")

/**
 * Strategy describing what should happen when an authenticated route is hit
 * without a principal.
 *
 * - A `string` is interpreted as a redirect URL: the {@link AuthenticatedGuard}
 *   throws an `UnauthorizedRedirectException` with a 303 See Other status.
 * - An `HttpException` subclass is instantiated with a fixed access-denied
 *   message and thrown directly, allowing consumers to surface arbitrary
 *   HTTP statuses (e.g. `NotFoundException`, `ForbiddenException`).
 *
 * @example Redirect to login page
 * ```typescript
 * onUnauthenticated: "/auth/magic-link"
 * ```
 *
 * @example Disguise the route by returning 404
 * ```typescript
 * onUnauthenticated: NotFoundException
 * ```
 */
export type OnUnauthenticated = string | (new (...args: any[]) => HttpException)

/**
 * Subject and HTML body for a magic link email template.
 */
export interface MailerTemplate {
  /** Email subject line */
  subject: string
  /** HTML template with {{token}} placeholder */
  html: string
}

/**
 * Configuration options for the mailer.
 */
export interface MailerOptions {
  /** SMTP host */
  host: string
  /** SMTP port */
  port: number
  /** From address for emails */
  from: string
  /** Template sent to new users (registration) */
  welcome: MailerTemplate
  /** Template sent to existing users (login) */
  welcomeBack: MailerTemplate
  /** SMTP authentication credentials */
  auth?: { user: string; pass: string }
}

/**
 * Configuration options for session cookies.
 */
export interface CookieOptions {
  /** Cookie name (default: "auth.sid") */
  name?: string
  /** Cookie domain */
  domain?: string
  /** Cookie path (default: "/") */
  path?: string
  /** Secure flag — only send over HTTPS (default: true) */
  secure?: boolean
  /**
   * SameSite attribute (default: "lax").
   *
   * Setting this to "none" requires `secure: true` and exposes
   * state-changing endpoints (e.g. logout) to cross-site request
   * forgery (CSRF). If you need "none" for cross-origin support,
   * implement CSRF protection on your application's POST endpoints.
   */
  sameSite?: "strict" | "lax" | "none"
}

/**
 * Configuration options for magic link authentication.
 */
export interface MagicLinkOptions {
  /** Mailer configuration for sending magic link emails */
  mailer: MailerOptions
}

/**
 * Configuration options for Google OAuth authentication.
 */
export interface GoogleAuthOptions {
  /** Google OAuth client ID */
  clientId: string
  /** Google OAuth client secret */
  clientSecret: string
  /** OAuth redirect URI */
  redirectUri: string
  /**
   * OAuth scopes to request during authorization.
   * Defaults to `["openid", "email", "profile"]`.
   */
  scopes?: string[]
  /**
   * Google OAuth token endpoint URL.
   * Defaults to `https://oauth2.googleapis.com/token`.
   *
   * @warning This should not be overridden in production. It exists
   * for testing purposes (e.g., pointing to a mock server).
   */
  tokenEndpoint?: string
}

/**
 * The set of entity classes auth needs repository handles for. Always
 * includes the principal under `authenticatable`; when `googleAuth` is
 * configured the OAuth-token entity is required under `oauthToken` so
 * that {@link GoogleAuthService} can persist tokens from the code
 * exchange.
 *
 * @typeParam T - The principal class implementing Authenticatable
 * @typeParam U - The OAuth-token class implementing OAuthTokenable
 *
 * @example Magic link only — no token entity needed
 * ```typescript
 * entities: { authenticatable: User }
 * ```
 *
 * @example Google OAuth — token entity is required
 * ```typescript
 * entities: { authenticatable: User, oauthToken: OAuthToken }
 * ```
 */
export interface AuthEntities<
  T extends Authenticatable = Authenticatable,
  U extends OAuthTokenable = OAuthTokenable,
> {
  /**
   * The entity class used for registration, authentication, and
   * principal lookup.
   */
  authenticatable: new () => T
  /**
   * The entity class used to persist OAuth tokens captured during
   * third-party sign-in. Required when `googleAuth` is configured.
   */
  oauthToken?: new () => U
}

/**
 * Base configuration options shared by all auth strategies.
 *
 * @typeParam T - The principal class implementing Authenticatable
 * @typeParam U - The OAuth-token class implementing OAuthTokenable
 */
interface AuthBaseOptions<
  T extends Authenticatable = Authenticatable,
  U extends OAuthTokenable = OAuthTokenable,
> {
  /** Secret key used to sign and verify JWTs */
  secret: string
  /** Token expiration time (e.g., "1h", "7d", or seconds as number) */
  expiresIn: jwt.SignOptions["expiresIn"]
  /**
   * Entity classes auth resolves at runtime. See {@link AuthEntities}.
   */
  entities: AuthEntities<T, U>
  /** Session cookie configuration */
  cookie?: CookieOptions
  /**
   * Default strategy used by the `@Authenticated()` decorator when a route is
   * accessed without an authenticated principal. Per-route metadata supplied
   * to `@Authenticated({ onUnauthenticated })` takes precedence over this
   * default. When omitted, the guard throws a plain `UnauthorizedException`.
   */
  onUnauthenticated?: OnUnauthenticated
}

/**
 * Configuration options for the authentication module.
 *
 * At least one authentication strategy (`magicLink` or `googleAuth`)
 * must be provided. When `googleAuth` is configured, `entities.oauthToken`
 * is also required so tokens captured during the code exchange can be
 * persisted.
 *
 * @typeParam T - The principal class implementing Authenticatable
 * @typeParam U - The OAuth-token class implementing OAuthTokenable
 *
 * @example Magic link only
 * ```typescript
 * AuthModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: "1h",
 *   entities: { authenticatable: User },
 *   magicLink: { mailer: { ... } },
 * })
 * ```
 *
 * @example Both strategies
 * ```typescript
 * AuthModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: "1h",
 *   entities: { authenticatable: User, oauthToken: OAuthToken },
 *   magicLink: { mailer: { ... } },
 *   googleAuth: {
 *     clientId: process.env.GOOGLE_CLIENT_ID,
 *     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
 *     redirectUri: "https://myapp.com/auth/google/callback",
 *   },
 * })
 * ```
 */
export type AuthOptions<
  T extends Authenticatable = Authenticatable,
  U extends OAuthTokenable = OAuthTokenable,
> = AuthBaseOptions<T, U> &
  (
    | { magicLink: MagicLinkOptions; googleAuth?: never }
    | {
        magicLink?: MagicLinkOptions
        googleAuth: GoogleAuthOptions
        entities: AuthEntities<T, U> & { oauthToken: new () => U }
      }
  )
