import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { createTransport, Transporter } from "nodemailer"
import { DataSource } from "typeorm"

import {
  AUTH_OPTIONS,
  AuthOptions,
  MailerOptions,
  RESOLVED_AUTH_OPTIONS,
  ResolvedAuthOptions,
} from "../auth.options"
import { Account } from "../entities/account.entity"
import { AuthenticatedEvent } from "../events/authenticated.event"
import { RegisteredEvent } from "../events/registered.event"
import { InvalidMagicLinkTokenException } from "../exceptions/invalid-magic-link-token.exception"
import { type Authenticatable } from "../interfaces/authenticatable.interface"

import { TokenService } from "./token.service"

export const MAGIC_LINK_AUDIENCE = "magic-link"
export const SESSION_AUDIENCE = "session"

/**
 * Result of verifying a magic link token.
 *
 * @typeParam T - The configured account entity type. Defaults to the
 *   reference {@link Account}.
 */
export interface MagicLinkVerifyResult<T extends Authenticatable = Account> {
  /**
   * The authenticated or newly created account entity.
   */
  entity: T

  /**
   * True if this was a new registration, false if existing user.
   */
  isNewUser: boolean
}

/**
 * @typeParam T - The configured account entity type. Defaults to the
 *   reference {@link Account}. Consumers narrow at the injection site.
 */
@Injectable()
export class MagicLinkService<T extends Authenticatable = Account> {
  private transport?: Transporter

  public constructor(
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
    @Inject(RESOLVED_AUTH_OPTIONS)
    private readonly resolved: ResolvedAuthOptions,
    private readonly tokenService: TokenService,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Returns the mailer options, throwing if magic link is not configured.
   *
   * @returns The mailer options from the magicLink configuration
   * @throws {Error} If magicLink is not configured in AuthOptions
   */
  private getMailer(): MailerOptions {
    const mailer = this.options.magicLink?.mailer
    if (!mailer) {
      throw new Error(
        "Magic link is not configured. Provide magicLink.mailer in AuthOptions to use MagicLinkService.",
      )
    }
    return mailer
  }

  /**
   * Returns the nodemailer transport, lazily creating it on first use.
   *
   * @returns The nodemailer Transporter instance
   * @throws {Error} If magicLink is not configured in AuthOptions
   */
  private getTransport(): Transporter {
    if (!this.transport) {
      const mailer = this.getMailer()
      this.transport = createTransport({
        host: mailer.host,
        port: mailer.port,
        auth: mailer.auth,
      })
    }
    return this.transport
  }

  public async send(email: string): Promise<void> {
    const mailer = this.getMailer()
    const transport = this.getTransport()

    const { token } = this.tokenService.issue(
      { email, aud: MAGIC_LINK_AUDIENCE },
      { expiresIn: "15m" },
    )

    const repo = this.datasource.getRepository(this.resolved.entity)
    const exists = await repo.exists({
      where: { email: email.toLowerCase() },
    })

    const template = exists ? mailer.welcomeBack : mailer.welcome
    const html = template.html.replaceAll("{{token}}", token)

    await transport.sendMail({
      from: mailer.from,
      to: email,
      subject: template.subject,
      html,
    })
  }

  /**
   * Verifies a magic link token and returns/creates the account entity.
   *
   * - Validates token signature and expiry
   * - Validates required claims (aud, email)
   * - Creates new account if email not found, or returns existing
   * - Emits `auth.registered` for new accounts, `auth.authenticated` for existing
   *
   * @param token - The magic link JWT token
   * @returns Object containing the account and whether it's a new user
   * @throws {@link TokenFailedVerificationException} if token signature invalid or expired
   * @throws {@link InvalidMagicLinkTokenException} if missing required claims or wrong audience
   *
   * @example
   * ```typescript
   * const { entity, isNewUser } = await magicLinkService.verify(token)
   * if (isNewUser) {
   *   await emailService.sendWelcome(entity.email)
   * }
   * ```
   *
   * @fires auth.registered - when a new account is created
   * @fires auth.authenticated - when an existing account is authenticated
   */
  public async verify(token: string): Promise<MagicLinkVerifyResult<T>> {
    const payload = this.tokenService.verify(token)

    if (payload.aud !== MAGIC_LINK_AUDIENCE) {
      throw new InvalidMagicLinkTokenException("invalid audience")
    }

    if (!payload.email) {
      throw new InvalidMagicLinkTokenException("missing email claim")
    }

    const email = (payload.email as string).toLowerCase()
    const repo = this.datasource.getRepository(this.resolved.entity)

    const existing = await repo.findOne({ where: { email } })

    if (existing) {
      this.eventEmitter.emit(
        AuthenticatedEvent.EVENT_NAME,
        new AuthenticatedEvent(existing as Account),
      )
      // Repo is built from the configured entity class — cast at the
      // boundary to honour the class-level generic.
      return { entity: existing as T, isNewUser: false }
    }

    const toSave = repo.create({ email })
    const saved = await repo.save(toSave)

    this.eventEmitter.emit(
      RegisteredEvent.EVENT_NAME,
      new RegisteredEvent(saved as Account),
    )

    return { entity: saved as T, isNewUser: true }
  }
}
