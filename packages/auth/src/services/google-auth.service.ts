import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import * as jwt from "jsonwebtoken"
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from "typeorm"

import { AUTH_OPTIONS, AuthOptions, GoogleAuthOptions } from "../auth.options"
import { AuthenticatedEvent } from "../events/authenticated.event"
import { RegisteredEvent } from "../events/registered.event"
import { EmailNotVerifiedException } from "../exceptions/email-not-verified.exception"
import { GoogleCodeExchangeException } from "../exceptions/google-code-exchange.exception"
import { GoogleNetworkException } from "../exceptions/google-network.exception"
import { GoogleServiceException } from "../exceptions/google-service.exception"
import { GoogleTokenException } from "../exceptions/google-token.exception"
import {
  Authenticatable,
  AuthenticatableProfile,
} from "../interfaces/authenticatable.interface"
import { type OAuthTokenable } from "../interfaces/oauth-tokenable.interface"

/**
 * Provider-specific profile data returned from Google OAuth.
 */
export interface GoogleProfile {
  /** Google account subject identifier */
  sub: string
  /** Display name from Google account */
  name?: string
  /** Profile picture URL from Google account */
  picture?: string
}

/**
 * Result of authenticating via Google OAuth code exchange.
 *
 * @typeParam T - The entity class implementing Authenticatable
 */
export interface GoogleAuthResult<T extends Authenticatable> {
  /** The authenticated or newly created entity */
  entity: T
  /** True if this was a new registration, false if existing user */
  isNewUser: boolean
  /** Google profile data extracted from the ID token */
  profile: GoogleProfile
}

/**
 * Exchanges a Google authorization code for a verified user entity.
 *
 * Follows the same find-or-create-by-email pattern as MagicLinkService.verify():
 * 1. Exchanges the code with Google's token endpoint
 * 2. Decodes the ID token to extract user info
 * 3. Finds an existing user by email or creates a new one
 * 4. Optionally writes Google profile data to the entity
 * 5. Upserts the OAuth token row (when `entities.oauthToken` is configured)
 * 6. Emits registration or authentication events after the transaction commits
 *
 * Steps 3–5 run inside a single `DataSource.transaction()` so the
 * principal row and the OAuth-token row stay consistent — either both
 * persist or both roll back.
 *
 * @example
 * ```typescript
 * const result = await googleAuthService.authenticate<User>(code)
 * if (result.isNewUser) {
 *   console.log('New user registered via Google:', result.entity.email)
 * }
 * ```
 */
@Injectable()
export class GoogleAuthService {
  private static readonly DEFAULT_TOKEN_ENDPOINT =
    "https://oauth2.googleapis.com/token"

  private static readonly DEFAULT_SCOPES = ["openid", "email", "profile"]

  public constructor(
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Builds the Google OAuth authorize URL from the configured options.
   *
   * @returns The authorize URL, or `null` if Google OAuth is not configured
   *
   * @example
   * ```typescript
   * const url = googleAuthService.authorizeUrl
   * // => URL { href: "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&scope=openid+email+profile" }
   * ```
   */
  public get authorizeUrl(): URL | null {
    const googleAuth = this.options.googleAuth
    if (!googleAuth) {
      return null
    }

    const scopes = googleAuth.scopes ?? GoogleAuthService.DEFAULT_SCOPES
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    url.searchParams.set("client_id", googleAuth.clientId)
    url.searchParams.set("redirect_uri", googleAuth.redirectUri)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", scopes.join(" "))

    return url
  }

  /**
   * Returns the Google OAuth options, throwing if not configured.
   *
   * @returns The Google OAuth configuration
   * @throws {Error} If googleAuth is not configured in AuthOptions
   */
  private getGoogleAuth(): GoogleAuthOptions {
    const googleAuth = this.options.googleAuth
    if (!googleAuth) {
      throw new Error(
        "Google OAuth is not configured. Provide googleAuth in AuthOptions to use GoogleAuthService.",
      )
    }
    return googleAuth
  }

  /**
   * Exchanges a Google authorization code for user credentials and finds or
   * creates the corresponding entity.
   *
   * @param code - The authorization code from Google's OAuth redirect
   * @returns Object containing the entity, isNewUser flag, and Google profile
   * @throws {GoogleCodeExchangeException} If Google's token endpoint returns a non-OK HTTP response
   * @throws {GoogleServiceException} If Google's token endpoint returns a 5xx server error
   * @throws {GoogleNetworkException} If the fetch call itself fails (network error, DNS, timeout)
   * @throws {GoogleTokenException} If the ID token is missing, has no email claim, or has no sub claim
   * @throws {EmailNotVerifiedException} If the ID token has email_verified explicitly set to false
   * @throws {Error} If googleAuth is not configured
   *
   * @example
   * ```typescript
   * const { entity, isNewUser, profile } = await googleAuthService.authenticate<User>(code)
   * ```
   *
   * @fires auth.registered - when a new user is created
   * @fires auth.authenticated - when an existing user is authenticated
   */
  public async authenticate<T extends Authenticatable>(
    code: string,
  ): Promise<GoogleAuthResult<T>> {
    const googleAuth = this.getGoogleAuth()

    const tokenEndpoint =
      googleAuth.tokenEndpoint ?? GoogleAuthService.DEFAULT_TOKEN_ENDPOINT

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: googleAuth.clientId,
      client_secret: googleAuth.clientSecret,
      redirect_uri: googleAuth.redirectUri,
    })

    let response: Response
    try {
      response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      })
    } catch (error) {
      throw new GoogleNetworkException(
        error instanceof Error ? error.message : "network error",
      )
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      const description =
        (errorBody as Record<string, string>).error_description ??
        `HTTP ${response.status}`

      if (response.status >= 500) {
        throw new GoogleServiceException(description)
      }

      throw new GoogleCodeExchangeException(description)
    }

    const tokenData = (await response.json()) as {
      id_token: string
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    }
    // The ID token is received directly from Google's token endpoint over HTTPS
    // in a server-to-server exchange (not from a client). Signature verification
    // is unnecessary in the auth code flow — the token's authenticity is ensured
    // by the TLS connection and the client_secret used in the exchange.
    // See: https://developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo
    const decoded = jwt.decode(tokenData.id_token) as Record<string, any> | null

    const email = decoded?.email as string | undefined
    if (!email) {
      throw new GoogleTokenException("missing email in ID token")
    }

    if (decoded?.email_verified === false) {
      throw new EmailNotVerifiedException(email)
    }

    const sub = decoded?.sub as string | undefined
    if (!sub) {
      throw new GoogleTokenException("missing sub in ID token")
    }
    const name = decoded?.name as string | undefined
    const picture = decoded?.picture as string | undefined
    const profile: GoogleProfile = { sub, name, picture }

    const normalizedEmail = email.toLowerCase()
    const authenticatableClass = this.options.entities.authenticatable
    const oauthTokenClass = this.options.entities.oauthToken

    // Persist principal and OAuth token row inside a single transaction so
    // either both writes commit or both roll back. Events fire only after
    // the transaction returns successfully — listeners must observe the
    // persisted state.
    const { entity, isNewUser } = await this.datasource.transaction(
      async (manager: EntityManager) => {
        const principalRepo = manager.getRepository<T>(authenticatableClass)

        const existing = await principalRepo.findOne({
          where: { email: normalizedEmail } as FindOptionsWhere<T>,
        })

        if (existing) {
          if ("authProfile" in existing) {
            const entityProfile =
              (existing.authProfile as AuthenticatableProfile) ?? {}
            ;(existing as any).authProfile = {
              ...entityProfile,
              google: { sub, name, picture },
            }
            await principalRepo.save(existing)
          }

          if (oauthTokenClass) {
            await this.upsertGoogleToken(
              manager.getRepository(oauthTokenClass),
              existing,
              tokenData,
            )
          }

          return { entity: existing, isNewUser: false }
        }

        const created = principalRepo.create({ email: normalizedEmail } as T)
        if ("authProfile" in created) {
          ;(created as any).authProfile = { google: { sub, name, picture } }
        }
        const saved = await principalRepo.save(created)

        if (oauthTokenClass) {
          await this.upsertGoogleToken(
            manager.getRepository(oauthTokenClass),
            saved,
            tokenData,
          )
        }

        return { entity: saved, isNewUser: true }
      },
    )

    if (isNewUser) {
      this.eventEmitter.emit(
        RegisteredEvent.EVENT_NAME,
        new RegisteredEvent(entity, "google"),
      )
    } else {
      this.eventEmitter.emit(
        AuthenticatedEvent.EVENT_NAME,
        new AuthenticatedEvent(entity, "google"),
      )
    }

    return { entity, isNewUser, profile }
  }

  /**
   * Upserts the Google OAuth token row for the given principal inside the
   * supplied transactional repository.
   *
   * Preserves the existing `refreshToken` when Google omits `refresh_token`
   * on the new response — Google only returns the refresh token on the
   * first consent. When `tokenData.access_token` is absent the upsert is
   * skipped: a row without an access token has no useful state.
   */
  private async upsertGoogleToken<U extends OAuthTokenable>(
    tokenRepo: Repository<U>,
    principal: Authenticatable,
    tokenData: {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    },
  ): Promise<void> {
    if (!tokenData.access_token) {
      return
    }

    const existing = await tokenRepo.findOne({
      where: {
        principal: { id: principal.id },
        provider: "google",
      } as FindOptionsWhere<U>,
    })

    const expiresInSeconds = tokenData.expires_in ?? 3600
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
    const scopes = tokenData.scope ? tokenData.scope.split(" ") : []
    const refreshToken =
      tokenData.refresh_token ?? existing?.refreshToken ?? null

    if (existing) {
      await tokenRepo.save({
        ...existing,
        accessToken: tokenData.access_token,
        refreshToken,
        expiresAt,
        scopes,
      })
      return
    }

    await tokenRepo.save(
      tokenRepo.create({
        principal,
        provider: "google",
        accessToken: tokenData.access_token,
        refreshToken,
        expiresAt,
        scopes,
      } as unknown as U),
    )
  }
}
