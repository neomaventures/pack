import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { DataSource } from "typeorm"

import { AuthOptions, AUTH_OPTIONS } from "../auth.options"
import { Account } from "../entities/account.entity"
import { AuthenticatedEvent } from "../events/authenticated.event"
import { IncorrectCredentialsException } from "../exceptions/incorrect-credentials.exception"
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"

import { SESSION_AUDIENCE } from "./magic-link.service"
import { TokenService } from "./token.service"

/**
 * Handles user authentication by validating session tokens against the
 * `Account` table.
 *
 * Accepts a raw JWT token string (not a full Authorization header).
 * Bearer/Cookie extraction is handled by the respective middlewares.
 */
@Injectable()
export class AuthenticationService {
  public constructor(
    // AUTH_OPTIONS is currently unused here but kept on the constructor
    // signature so the service stays consistent with the rest of the
    // package — every auth service injects options for parity / future
    // use without breaking DI wiring.

    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
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
   * @returns The authenticated Account
   * @throws {@link InvalidCredentialsException} if token is null/undefined, invalid, expired, wrong audience, or missing sub
   * @throws {@link IncorrectCredentialsException} if the account in token doesn't exist
   *
   * @fires auth.authenticated
   */
  public async authenticate(token: string): Promise<Account> {
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

    const repo = this.datasource.getRepository(Account)
    const account = await repo.findOne({ where: { id: sub } })

    if (!account) {
      throw new IncorrectCredentialsException(sub)
    }

    this.eventEmitter.emit(
      AuthenticatedEvent.EVENT_NAME,
      new AuthenticatedEvent(account, "session"),
    )

    return account
  }
}
