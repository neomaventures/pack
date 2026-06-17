import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { DataSource } from "typeorm"

import {
  AUTH_OPTIONS,
  AuthOptions,
  RESOLVED_AUTH_OPTIONS,
  ResolvedAuthOptions,
} from "../auth.options"
import { Account } from "../entities/account.entity"
import { AuthenticatedEvent } from "../events/authenticated.event"
import { IncorrectCredentialsException } from "../exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { type Authenticatable } from "../interfaces/authenticatable.interface"

import { SESSION_AUDIENCE } from "./magic-link.service"
import { TokenService } from "./token.service"

/**
 * Handles user authentication by validating session tokens against the
 * configured account entity.
 *
 * Accepts a raw JWT token string (not a full Authorization header).
 * Bearer/Cookie extraction is handled by the respective middlewares.
 *
 * @typeParam T - The configured account entity type. Defaults to the
 *   reference {@link Account}. Consumers narrow at the injection site:
 *   `private readonly auth: AuthenticationService<CustomAccount>`.
 */
@Injectable()
export class AuthenticationService<T extends Authenticatable = Account> {
  public constructor(
    // AUTH_OPTIONS is currently unused here but kept on the constructor
    // signature so the service stays consistent with the rest of the
    // package — every auth service injects options for parity / future
    // use without breaking DI wiring.

    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
    @Inject(RESOLVED_AUTH_OPTIONS)
    private readonly resolved: ResolvedAuthOptions,
    private readonly tokenService: TokenService,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Authenticates a user by validating a raw JWT session token.
   *
   * - Token is verified via TokenService (HS256 algorithm enforced)
   * - Audience must be "session"
   * - Account is looked up by the `sub` claim
   *
   * @param token - Raw JWT token string
   * @returns The authenticated account entity
   * @throws {@link InvalidCredentialsException} if token is null/undefined, invalid, expired, wrong audience, or missing sub
   * @throws {@link IncorrectCredentialsException} if the account in token doesn't exist
   *
   * @fires auth.authenticated
   */
  public async authenticate(token: string): Promise<T> {
    if (token === null || token === undefined) {
      throw new InvalidCredentialsException("token cannot be null or undefined")
    }

    let jwt: Record<string, any>
    try {
      jwt = this.tokenService.verify(token)
    } catch {
      throw new InvalidCredentialsException(
        "Invalid or expired authentication token",
      )
    }

    if (jwt.aud !== SESSION_AUDIENCE) {
      throw new InvalidCredentialsException("Invalid JWT: wrong audience")
    }

    const sub = jwt.sub as string | undefined
    if (!sub) {
      throw new InvalidCredentialsException(
        "Invalid JWT payload: missing sub claim",
      )
    }

    const repo = this.datasource.getRepository(this.resolved.entity)
    const account = await repo.findOne({ where: { id: sub } })

    if (!account) {
      throw new IncorrectCredentialsException(sub)
    }

    // The repository is constructed from `resolved.entity` which is the
    // class the consumer configured (or the reference default). Trust the
    // config-is-correct line: cast to T at the service boundary.
    const entity = account as T

    this.eventEmitter.emit(
      AuthenticatedEvent.EVENT_NAME,
      new AuthenticatedEvent<T>(entity, "session"),
    )

    return entity
  }
}
