import { type HttpException } from "@nestjs/common"
import type * as jwt from "jsonwebtoken"

import { type Authenticatable } from "./interfaces/authenticatable.interface"
import { type OAuthTokenable } from "./interfaces/oauth-tokenable.interface"

export const AUTH_OPTIONS = Symbol("AUTH_OPTIONS")

/**
 * Package-internal token carrying the fully-resolved auth options — `entity`
 * and `oauthTokenEntity` are materialised to their concrete defaults
 * (`Account` / `OAuthToken`) when consumers omit them.
 *
 * Not exported from the package's public barrel. Services inside the
 * package inject this token instead of {@link AUTH_OPTIONS} when they need
 * the entity classes.
 */
export const RESOLVED_AUTH_OPTIONS = Symbol("RESOLVED_AUTH_OPTIONS")

/**
 * Strategy describing what should happen when an authenticated route is hit
 * without an account.
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
 * Base configuration options shared by all auth strategies.
 *
 * Auth ships reference `Account` and `OAuthToken` entity classes implementing
 * {@link Authenticatable} and {@link OAuthTokenable}. Consumers register the
 * entity classes they use via `TypeOrmModule.forFeature([...])` — either the
 * reference classes or their own replacements supplied through {@link accountEntity}
 * and {@link oauthTokenEntity} below.
 */
interface AuthBaseOptions {
  /** Secret key used to sign and verify JWTs */
  secret: string
  /** Token expiration time (e.g., "1h", "7d", or seconds as number) */
  expiresIn: jwt.SignOptions["expiresIn"]
  /** Session cookie configuration */
  cookie?: CookieOptions
  /**
   * Default strategy used by the `@Authenticated()` decorator when a route is
   * accessed without an authenticated account. Per-route metadata supplied
   * to `@Authenticated({ onUnauthenticated })` takes precedence over this
   * default. When omitted, the guard throws a plain `UnauthorizedException`.
   */
  onUnauthenticated?: OnUnauthenticated
  /**
   * Custom account entity class implementing {@link Authenticatable}. When
   * omitted, the package's reference `Account` entity is used. Supplying a
   * custom class lets consumers add columns, relations, or methods while
   * keeping the package's service surface unchanged.
   */
  accountEntity?: new (...args: any[]) => Authenticatable
  /**
   * Custom OAuth token entity class implementing {@link OAuthTokenable}. When
   * omitted, the package's reference `OAuthToken` entity is used.
   */
  oauthTokenEntity?: new (...args: any[]) => OAuthTokenable
}

/**
 * Configuration options for the authentication module.
 *
 * At least one authentication strategy (`magicLink` or `googleAuth`)
 * must be provided.
 *
 * @example Magic link only
 * ```typescript
 * AuthModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: "1h",
 *   magicLink: { mailer: { ... } },
 * })
 * ```
 *
 * @example Both strategies
 * ```typescript
 * AuthModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: "1h",
 *   magicLink: { mailer: { ... } },
 *   googleAuth: {
 *     clientId: process.env.GOOGLE_CLIENT_ID,
 *     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
 *     redirectUri: "https://myapp.com/auth/google/callback",
 *   },
 * })
 * ```
 */
export type AuthOptions = AuthBaseOptions &
  (
    | { magicLink: MagicLinkOptions; googleAuth?: never }
    | {
        magicLink?: MagicLinkOptions
        googleAuth: GoogleAuthOptions
      }
  )

/**
 * Fully-resolved auth options exposed via {@link RESOLVED_AUTH_OPTIONS}. Mirrors
 * {@link AuthOptions} but with `entity` and `oauthTokenEntity` materialised to
 * their concrete defaults so service code never sees `undefined`.
 *
 * Package-internal — not exported from the public barrel.
 */
export type ResolvedAuthOptions = AuthOptions & {
  accountEntity: new (...args: any[]) => Authenticatable
  oauthTokenEntity: new (...args: any[]) => OAuthTokenable
}
