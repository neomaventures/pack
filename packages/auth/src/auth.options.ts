import type * as jwt from "jsonwebtoken"

import { type Authenticatable } from "./interfaces/authenticatable.interface"

export const AUTH_OPTIONS = Symbol("AUTH_OPTIONS")

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
 * @typeParam T - The entity class implementing Authenticatable
 */
interface AuthBaseOptions<T extends Authenticatable = Authenticatable> {
  /** Secret key used to sign and verify JWTs */
  secret: string
  /** Token expiration time (e.g., "1h", "7d", or seconds as number) */
  expiresIn: jwt.SignOptions["expiresIn"]
  /** The entity class used for registration, authentication, and principal lookup */
  entity: new () => T
  /** Session cookie configuration */
  cookie?: CookieOptions
}

/**
 * Configuration options for the authentication module.
 *
 * At least one authentication strategy (`magicLink` or `googleAuth`) must be provided.
 *
 * @typeParam T - The entity class implementing Authenticatable
 *
 * @example Magic link only
 * ```typescript
 * AuthModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: '1h',
 *   entity: User,
 *   magicLink: {
 *     mailer: {
 *       host: 'smtp.example.com',
 *       port: 587,
 *       from: 'noreply@example.com',
 *       welcome: { subject: 'Welcome', html: '...' },
 *       welcomeBack: { subject: 'Welcome back', html: '...' },
 *     },
 *   },
 * })
 * ```
 *
 * @example Both strategies
 * ```typescript
 * AuthModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: '1h',
 *   entity: User,
 *   magicLink: { mailer: { ... } },
 *   googleAuth: {
 *     clientId: process.env.GOOGLE_CLIENT_ID,
 *     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
 *     redirectUri: 'https://myapp.com/auth/google/callback',
 *   },
 * })
 * ```
 */
export type AuthOptions<T extends Authenticatable = Authenticatable> =
  AuthBaseOptions<T> &
    (
      | { magicLink: MagicLinkOptions; googleAuth?: GoogleAuthOptions }
      | { magicLink?: MagicLinkOptions; googleAuth: GoogleAuthOptions }
    )
