import {
  EmailDto,
  GetGoogleAuthResult,
  type GoogleAuthResult,
  GoogleCallback,
  MagicLinkService,
  SessionService,
} from "@neomaventures/auth"
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

import { type Account } from "~auth/account.entity"

const { FOUND, SEE_OTHER } = HttpStatus

/**
 * Handles the authentication ceremony: registration form,
 * magic link sending, verification, and logout.
 */
@Controller("auth")
export class AuthController {
  /**
   * @param logger - Structured logger for auth events.
   * @param magicLinkService - Sends and verifies magic link tokens.
   * @param sessionService - Creates and clears JWT session cookies.
   */
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
  @Redirect("", FOUND)
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
   * Renders the "link expired" error page.
   */
  @Get("magic-link/expired")
  @Render("auth/magic-link/expired")
  public magicLinkExpired(): void {}

  /**
   * Verifies a magic link token, creates a session, and redirects
   * to the home page.
   *
   * Invalid or expired tokens redirect to the "link expired" page.
   *
   * @param token - The magic link JWT from the query string.
   * @param res - The Express response, used by SessionService to set the session cookie.
   *
   * @returns The redirect URL for the home page.
   */
  @ErrorTemplate({ default: "/auth/magic-link/expired" })
  @Get("magic-link/callback")
  @Redirect("", FOUND)
  public async callback(
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ url: string }> {
    const { entity } = await this.magicLinkService.verify(token)
    this.sessionService.create(res, entity)
    return { url: "/dashboard" }
  }

  /**
   * Handles the Google OAuth callback by exchanging the authorization code
   * for user credentials, creating a session, and redirecting to the dashboard.
   *
   * On failure (invalid code, network error, etc.), the exception handler
   * redirects to the registration page.
   *
   * @param result - The Google authentication result from the interceptor.
   * @param res - The Express response, used by SessionService to set the session cookie.
   *
   * @returns The redirect URL for the dashboard.
   */
  @Get("google/callback")
  @GoogleCallback()
  @ErrorTemplate({ default: "/auth/register" })
  @Redirect("", FOUND)
  public googleCallback(
    @GetGoogleAuthResult() { entity }: GoogleAuthResult<Account>,
    @Res({ passthrough: true }) res: Response,
  ): { url: string } {
    this.sessionService.create(res, entity)
    return { url: "/dashboard" }
  }

  /**
   * Clears the session cookie and redirects to the home page.
   *
   * @param res - The Express response, used to clear the session cookie.
   */
  @Post("logout")
  @Redirect("/", SEE_OTHER)
  public logout(@Res({ passthrough: true }) res: Response): void {
    this.sessionService.clear(res)
  }
}
