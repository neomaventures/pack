import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { createTransport, Transporter } from "nodemailer"
import { DataSource, FindOptionsWhere } from "typeorm"

import { GarmrAuthenticatedEvent } from "../events/garmr-authenticated.event"
import { GarmrRegisteredEvent } from "../events/garmr-registered.event"
import { InvalidMagicLinkTokenException } from "../exceptions/invalid-magic-link-token.exception"
import { GARMR_OPTIONS, GarmrOptions, MailerOptions } from "../garmr.options"
import { Authenticatable } from "../interfaces/authenticatable.interface"

import { TokenService } from "./token.service"

export const MAGIC_LINK_AUDIENCE = "magic-link"
export const SESSION_AUDIENCE = "session"

/**
 * Result of verifying a magic link token.
 */
export interface MagicLinkVerifyResult<T extends Authenticatable> {
  /**
   * The authenticated or newly created entity.
   */
  entity: T

  /**
   * True if this was a new registration, false if existing user.
   */
  isNewUser: boolean
}

@Injectable()
export class MagicLinkService {
  private transport?: Transporter

  public constructor(
    @Inject(GARMR_OPTIONS) private readonly options: GarmrOptions,
    private readonly tokenService: TokenService,
    private readonly datasource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Returns the mailer options, throwing if magic link is not configured.
   *
   * @returns The mailer options from the magicLink configuration
   * @throws {Error} If magicLink is not configured in GarmrOptions
   */
  private getMailer(): MailerOptions {
    const mailer = this.options.magicLink?.mailer
    if (!mailer) {
      throw new Error(
        "Magic link is not configured. Provide magicLink.mailer in GarmrOptions to use MagicLinkService.",
      )
    }
    return mailer
  }

  /**
   * Returns the nodemailer transport, lazily creating it on first use.
   *
   * @returns The nodemailer Transporter instance
   * @throws {Error} If magicLink is not configured in GarmrOptions
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

    const repo = this.datasource.getRepository(this.options.entity)
    const exists = await repo.exists({
      where: {
        email: email.toLowerCase(),
      } as FindOptionsWhere<Authenticatable>,
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
   * Verifies a magic link token and returns/creates the user.
   *
   * - Validates token signature and expiry
   * - Validates required claims (aud, email)
   * - Creates new user if email not found, or returns existing user
   * - Emits `garmr.registered` for new users, `garmr.authenticated` for existing
   *
   * @param token - The magic link JWT token
   * @returns Object containing the entity and whether it's a new user
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
   * @fires garmr.registered - when a new user is created
   * @fires garmr.authenticated - when an existing user is authenticated
   */
  public async verify<T extends Authenticatable>(
    token: string,
  ): Promise<MagicLinkVerifyResult<T>> {
    const payload = this.tokenService.verify(token)

    if (payload.aud !== MAGIC_LINK_AUDIENCE) {
      throw new InvalidMagicLinkTokenException("invalid audience")
    }

    if (!payload.email) {
      throw new InvalidMagicLinkTokenException("missing email claim")
    }

    const email = (payload.email as string).toLowerCase()
    const repo = this.datasource.getRepository<T>(this.options.entity)

    const existing = await repo.findOne({
      where: { email } as FindOptionsWhere<T>,
    })

    if (existing) {
      this.eventEmitter.emit(
        GarmrAuthenticatedEvent.EVENT_NAME,
        new GarmrAuthenticatedEvent(existing),
      )
      return { entity: existing, isNewUser: false }
    }

    const toSave = repo.create({ email } as T)
    const saved = await repo.save(toSave)

    this.eventEmitter.emit(
      GarmrRegisteredEvent.EVENT_NAME,
      new GarmrRegisteredEvent(saved),
    )

    return { entity: saved, isNewUser: true }
  }
}
