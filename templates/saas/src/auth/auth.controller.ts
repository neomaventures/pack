import { EmailDto } from "@neomaventures/auth"
import { ErrorTemplate } from "@neomaventures/exceptions"
import { ApplicationLoggerService } from "@neomaventures/logging"
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Redirect,
  Render,
} from "@nestjs/common"

/**
 * Handles the authentication ceremony: registration form,
 * magic link sending, verification, and logout.
 */
@Controller("auth")
export class AuthController {
  public constructor(private readonly logger: ApplicationLoggerService) {}

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
   * error. On success, redirects to `/` (placeholder until magic
   * link sending is wired).
   *
   * @param email - The validated email address from the form body.
   */
  @Post("register")
  @ErrorTemplate({ BadRequestException: "auth/register", default: "/error" })
  @Redirect("/", HttpStatus.FOUND)
  public submitRegister(@Body() { email }: EmailDto): void {
    this.logger.log(`Registration submitted for ${email}`)
  }
}
