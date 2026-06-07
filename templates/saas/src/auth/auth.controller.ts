import { EmailDto, MagicLinkService, SessionService } from "@neomaventures/auth"
import { ErrorTemplate } from "@neomaventures/exceptions"
import { ApplicationLoggerService } from "@neomaventures/logging"
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in JSDoc {@link}
  type BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Redirect,
  Render,
  Res,
} from "@nestjs/common"
import { type Response } from "express"

/**
 * Handles the authentication ceremony: registration form,
 * magic link sending, verification, and logout.
 */
@Controller("auth")
export class AuthController {
  public constructor(
    private readonly logger: ApplicationLoggerService,
    private readonly magicLinkService: MagicLinkService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Renders the registration page.
   */
  @Get("register")
  @Render("auth/register")
  public register(): void {
    this.logger.log("Registration page requested")
  }

  /**
   * Handles the registration form submission.
   *
   * Validates the email via {@link EmailDto}. On validation failure,
   * the exception filter re-renders the registration form with the
   * error via {@link BadRequestException}. On success, sends a magic
   * link email and redirects to the confirmation page.
   *
   * @param email - The validated email address from the form body.
   *
   * @returns The redirect URL for the confirmation page.
   */
  @Post("register")
  @ErrorTemplate({ BadRequestException: "auth/register", default: "/error" })
  @Redirect("", HttpStatus.FOUND)
  public async submitRegister(
    @Body() { email }: EmailDto,
  ): Promise<{ url: string }> {
    this.logger.log(`Registration submitted for ${email}`)
    await this.magicLinkService.send(email)
    return { url: `/auth/magic-link/sent?email=${encodeURIComponent(email)}` }
  }

  /**
   * Renders the "check your email" confirmation page.
   *
   * Validates the email query parameter to prevent rendering
   * malicious input. Invalid emails redirect to `/auth/register`.
   *
   * @param email - The validated email address from the query string.
   *
   * @returns The email address to display in the template.
   */
  @ErrorTemplate({ default: "/auth/register" })
  @Get("magic-link/sent")
  @Render("auth/magic-link/sent")
  public magicLinkSent(@Query() { email }: EmailDto): { email: string } {
    return { email }
  }

  /**
   * Verifies a magic link token, creates a session, and redirects
   * to the home page.
   *
   * Invalid or expired tokens redirect to `/auth/register`.
   *
   * @param token - The magic link JWT from the query string.
   * @param res - The Express response, used by SessionService to set the session cookie.
   *
   * @returns The redirect URL for the home page.
   */
  @ErrorTemplate({ default: "/auth/register" })
  @Get("magic-link/callback")
  @Redirect("", HttpStatus.FOUND)
  public async callback(
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ url: string }> {
    const { entity } = await this.magicLinkService.verify(token)
    this.sessionService.create(res, entity)
    return { url: "/" }
  }
}
