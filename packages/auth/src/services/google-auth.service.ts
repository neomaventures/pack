import { HttpException, Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import * as jwt from "jsonwebtoken"
import { DataSource, EntityManager } from "typeorm"

import {
  AUTH_OPTIONS,
  AuthOptions,
  GoogleAuthOptions,
  RESOLVED_AUTH_OPTIONS,
  ResolvedAuthOptions,
} from "../auth.options"
import { Account } from "../entities/account.entity"
import { OAuthToken } from "../entities/oauth-token.entity"
import { AuthenticatedEvent } from "../events/authenticated.event"
import { RegisteredEvent } from "../events/registered.event"
import { AuthApiException } from "../exceptions/auth-api.exception"
import { AuthNetworkException } from "../exceptions/auth-network.exception"
import { EmailNotVerifiedException } from "../exceptions/email-not-verified.exception"
import { type Authenticatable } from "../interfaces/authenticatable.interface"
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
 * @typeParam T - The configured account entity type. Defaults to the
 *   reference {@link Account}.
 */
export interface GoogleAuthResult<T extends Authenticatable = Account> {
  /** The authenticated or newly created account entity */
  account: T
  /** True if this was a new registration, false if existing user */
  isNewAccount: boolean
  /** Google profile data extracted from the ID token */
  profile: GoogleProfile
}

/**
 * Shape of a successful response from Google's token endpoint. The
 * fields `access_token`, `expires_in`, `id_token`, and `scope` are
 * required by the OAuth 2.0 spec on a 200 response — we validate them
 * up front rather than treating absence as silently optional. The
 * `refresh_token` is only present on first consent.
 */
interface GoogleTokenResponse {
  id_token: string
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

/**
 * Exchanges a Google authorization code for an account entity.
 *
 * The {@link authenticate} method is intentionally orchestration-only —
 * it delegates each step to a small private helper:
 *
 * 1. {@link exchangeCodeForTokens} — POSTs to Google's token endpoint
 *    and validates the response shape (presence of `access_token`,
 *    `expires_in`, etc.).
 * 2. {@link decodeIdToken} — JWT-decodes the ID token and validates
 *    the `email`, `email_verified`, and `sub` claims.
 * 3. {@link findOrCreateAccount} — looks up the account by email or
 *    creates a new one, writing Google profile data into
 *    `account.authProfile.google`. Runs inside the transaction.
 * 4. {@link persistOAuthToken} — upserts the `(account, provider)`
 *    OAuth token row, preserving `refreshToken` when Google omits it.
 *    Runs inside the same transaction.
 *
 * Steps 3 and 4 run inside a single `DataSource.transaction()` so the
 * account row and the OAuth-token row stay consistent — either both
 * persist or both roll back. Registration / authentication events fire
 * only after the transaction commits.
 *
 * @typeParam T - The configured account entity type. Defaults to the
 *   reference {@link Account}.
 * @typeParam U - The configured OAuth-token entity type. Defaults to
 *   the reference {@link OAuthToken}.
 *
 * @example
 * ```typescript
 * const result = await googleAuthService.authenticate(code)
 * if (result.isNewAccount) {
 *   console.log('New account registered via Google:', result.account.email)
 * }
 * ```
 */
@Injectable()
export class GoogleAuthService<
  T extends Authenticatable = Account,
  U extends OAuthTokenable = OAuthToken,
> {
  private static readonly DEFAULT_TOKEN_ENDPOINT =
    "https://oauth2.googleapis.com/token"

  private static readonly DEFAULT_SCOPES = ["openid", "email", "profile"]

  private static readonly LOGIN_ENDPOINT = "/oauth/token"

  public constructor(
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
    @Inject(RESOLVED_AUTH_OPTIONS)
    private readonly resolved: ResolvedAuthOptions,
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
   * Exchanges a Google authorization code for an account entity.
   *
   * @param code - The authorization code from Google's OAuth redirect
   * @returns Object containing the account, isNewAccount flag, and Google profile
   * @throws {AuthApiException} If Google's token endpoint returns a non-2xx HTTP response, or returns 200 with a malformed body / ID token (missing `id_token`, `access_token`, `expires_in`, `email`, or `sub`). Diagnostic detail lives on `context.phase` (`"codeExchange"` | `"idTokenDecode"`) and `context.missingField` / `context.missingClaim`.
   * @throws {AuthNetworkException} If the fetch call itself fails (network error, DNS, timeout)
   * @throws {EmailNotVerifiedException} If the ID token has `email_verified` explicitly set to false
   * @throws {Error} If googleAuth is not configured
   *
   * @example
   * ```typescript
   * const { entity, isNewAccount, profile } = await googleAuthService.authenticate(code)
   * ```
   *
   * @fires auth.registered - when a new account is created
   * @fires auth.authenticated - when an existing account is authenticated
   */
  public async authenticate(code: string): Promise<GoogleAuthResult<T>> {
    const googleAuth = this.getGoogleAuth()

    const tokenEndpoint =
      googleAuth.tokenEndpoint ?? GoogleAuthService.DEFAULT_TOKEN_ENDPOINT
    const tokenResponse = await this.exchangeCodeForTokens(code, googleAuth)
    const { email, profile } = this.decodeIdToken(
      tokenResponse.id_token,
      tokenEndpoint,
    )

    const { account, isNewAccount } = await this.datasource.transaction(
      async (manager: EntityManager) => {
        const found = await this.findOrCreateAccount(manager, email, profile)
        await this.persistOAuthToken(manager, found.account, tokenResponse)
        return found
      },
    )

    if (isNewAccount) {
      this.eventEmitter.emit(
        RegisteredEvent.EVENT_NAME,
        new RegisteredEvent<T>(account, "google"),
      )
    } else {
      this.eventEmitter.emit(
        AuthenticatedEvent.EVENT_NAME,
        new AuthenticatedEvent<T>(account, "google"),
      )
    }

    return { account, isNewAccount, profile }
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
   * POSTs the authorization code to Google's token endpoint and validates
   * the response. The OAuth 2.0 spec requires `access_token` on a 200
   * response and Google always returns `expires_in`; absence of either
   * is treated as a malformed response. `refresh_token` is optional —
   * Google omits it on subsequent consents.
   *
   * @throws {AuthNetworkException} On fetch failure (DNS, TCP, timeout).
   *   `context.phase` is `"codeExchange"`.
   * @throws {AuthApiException} On non-2xx responses from Google, or on a
   *   200 response missing `access_token`, `expires_in`, or `id_token`.
   *   `context.phase` is `"codeExchange"`; the malformed-2xx case sets
   *   `context.missingField` and maps to 502 Bad Gateway.
   */
  private async exchangeCodeForTokens(
    code: string,
    googleAuth: GoogleAuthOptions,
  ): Promise<GoogleTokenResponse> {
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
      throw new AuthNetworkException(
        GoogleAuthService.LOGIN_ENDPOINT,
        { provider: "google", phase: "codeExchange", tokenEndpoint },
        error as Error,
      )
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      const description =
        (errorBody as Record<string, string>).error_description ??
        `HTTP ${response.status}`

      throw new AuthApiException(
        GoogleAuthService.LOGIN_ENDPOINT,
        {
          provider: "google",
          phase: "codeExchange",
          tokenEndpoint,
          errorDescription: description,
        },
        new HttpException(
          {
            statusCode: response.status,
            message: `Auth API returned ${response.status}`,
            body: errorBody,
          },
          response.status,
        ),
      )
    }

    const data = (await response.json()) as Partial<GoogleTokenResponse>

    if (!data.id_token) {
      throw new AuthApiException(
        GoogleAuthService.LOGIN_ENDPOINT,
        {
          provider: "google",
          phase: "codeExchange",
          missingField: "id_token",
          tokenEndpoint,
        },
        new HttpException(
          {
            statusCode: 200,
            message: "Auth API returned 200 with malformed token response",
            body: data,
          },
          200,
        ),
      )
    }
    if (!data.access_token) {
      throw new AuthApiException(
        GoogleAuthService.LOGIN_ENDPOINT,
        {
          provider: "google",
          phase: "codeExchange",
          missingField: "access_token",
          tokenEndpoint,
        },
        new HttpException(
          {
            statusCode: 200,
            message: "Auth API returned 200 with malformed token response",
            body: data,
          },
          200,
        ),
      )
    }
    if (typeof data.expires_in !== "number") {
      throw new AuthApiException(
        GoogleAuthService.LOGIN_ENDPOINT,
        {
          provider: "google",
          phase: "codeExchange",
          missingField: "expires_in",
          tokenEndpoint,
        },
        new HttpException(
          {
            statusCode: 200,
            message: "Auth API returned 200 with malformed token response",
            body: data,
          },
          200,
        ),
      )
    }

    return data as GoogleTokenResponse
  }

  /**
   * Decodes the Google ID token and validates the claims this package
   * relies on. The ID token is received directly from Google's token
   * endpoint over HTTPS in a server-to-server exchange (not from a
   * client), so signature verification is unnecessary — authenticity
   * is guaranteed by TLS and the `client_secret` used in the exchange.
   *
   * See: https://developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo
   *
   * @throws {AuthApiException} If the token is missing the `email` or
   *   `sub` claim. `context.phase` is `"idTokenDecode"` and
   *   `context.missingClaim` identifies the offending field.
   * @throws {EmailNotVerifiedException} If `email_verified` is explicitly
   *   `false`
   */
  private decodeIdToken(
    idToken: string,
    tokenEndpoint: string,
  ): {
    email: string
    profile: GoogleProfile
  } {
    const decoded = jwt.decode(idToken) as Record<string, any> | null

    const email = decoded?.email as string | undefined
    if (!email) {
      throw new AuthApiException(
        GoogleAuthService.LOGIN_ENDPOINT,
        {
          provider: "google",
          phase: "idTokenDecode",
          missingClaim: "email",
          tokenEndpoint,
        },
        new HttpException(
          {
            statusCode: 200,
            message: "Auth API returned ID token with missing claims",
            body: { idToken },
          },
          200,
        ),
      )
    }

    if (decoded?.email_verified === false) {
      throw new EmailNotVerifiedException(email)
    }

    const sub = decoded?.sub as string | undefined
    if (!sub) {
      throw new AuthApiException(
        GoogleAuthService.LOGIN_ENDPOINT,
        {
          provider: "google",
          phase: "idTokenDecode",
          missingClaim: "sub",
          tokenEndpoint,
        },
        new HttpException(
          {
            statusCode: 200,
            message: "Auth API returned ID token with missing claims",
            body: { idToken },
          },
          200,
        ),
      )
    }

    const name = decoded?.name as string | undefined
    const picture = decoded?.picture as string | undefined

    return { email, profile: { sub, name, picture } }
  }

  /**
   * Finds the account by email (case-insensitive) or creates a new row,
   * merging the Google profile data into `account.authProfile.google`.
   * Runs inside the supplied transactional `EntityManager`.
   */
  private async findOrCreateAccount(
    manager: EntityManager,
    email: string,
    profile: GoogleProfile,
  ): Promise<{ account: T; isNewAccount: boolean }> {
    const normalizedEmail = email.toLowerCase()
    const repo = manager.getRepository(this.resolved.accountEntity)

    const existing = await repo.findOne({ where: { email: normalizedEmail } })

    if (existing) {
      existing.authProfile = {
        ...(existing.authProfile ?? {}),
        google: profile,
      }
      await repo.save(existing)
      // Repo built from `resolved.accountEntity` — narrow at the boundary.
      return { account: existing as T, isNewAccount: false }
    }

    const created = repo.create({
      email: normalizedEmail,
      authProfile: { google: profile },
    })
    const saved = await repo.save(created)
    return { account: saved as T, isNewAccount: true }
  }

  /**
   * Persists the OAuth token row for the given account. Performs a
   * read-then-save against the unique `(account, provider)` index — the
   * entity-level `@Index(["account", "provider"], { unique: true })`
   * constraint guarantees there is at most one row per pair, so
   * subsequent logins overwrite that single row rather than appending
   * new ones.
   *
   * The refresh token is preserved when Google omits `refresh_token` on
   * a subsequent consent: Google only returns it the first time the user
   * grants access, and dropping it would force a re-consent flow.
   *
   * Runs inside the supplied transactional `EntityManager`.
   */
  private async persistOAuthToken(
    manager: EntityManager,
    account: T,
    tokenResponse: GoogleTokenResponse,
  ): Promise<void> {
    const tokenRepo = manager.getRepository(this.resolved.oauthTokenEntity)
    // `U` defaults to the reference OAuthToken; consumers that pass a
    // custom `oauthTokenEntity` narrow the existing-token shape here.
    // `refreshToken` is `select: false` on the entity, so opt in
    // explicitly via `.addSelect(...)` — this is the only production
    // reader of the column.
    const existing = (await tokenRepo
      .createQueryBuilder("oauth_token")
      .where(
        "oauth_token.accountId = :accountId AND oauth_token.provider = :provider",
        { accountId: account.id, provider: "google" },
      )
      .addSelect("oauth_token.refreshToken")
      .getOne()) as U | null

    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000)
    const scopes = tokenResponse.scope ? tokenResponse.scope.split(" ") : []
    // Preserve the existing refresh token when Google omits it on a
    // subsequent consent — Google only returns refresh_token on the
    // first consent.
    const refreshToken =
      tokenResponse.refresh_token ?? existing?.refreshToken ?? null

    if (existing) {
      await tokenRepo.save({
        ...existing,
        accessToken: tokenResponse.access_token,
        refreshToken,
        expiresAt,
        scopes,
      })
      return
    }

    await tokenRepo.save(
      tokenRepo.create({
        account,
        provider: "google",
        accessToken: tokenResponse.access_token,
        refreshToken,
        expiresAt,
        scopes,
      }),
    )
  }
}
