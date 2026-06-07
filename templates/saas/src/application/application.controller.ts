import { EmailDto } from "@neomaventures/auth"
import { ErrorTemplate } from "@neomaventures/exceptions"
import { ApplicationLoggerService } from "@neomaventures/logging"
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Query,
  Redirect,
  Render,
} from "@nestjs/common"

/**
 * Handles top-level routes for the SaaS template application.
 */
@Controller()
export class ApplicationController {
  public constructor(private readonly logger: ApplicationLoggerService) {}

  /**
   * Renders the welcome page.
   */
  @Get()
  @Render("welcome")
  public index(): void {
    this.logger.log("Welcome page requested")
  }

  /**
   * Renders the sign-up page.
   */
  @Get("signup")
  @Render("signup")
  public signup(): void {
    this.logger.log("Sign up page requested")
  }

  /**
   * Handles the sign-up form submission.
   *
   * Validates the email via {@link EmailDto} (from `@neomaventures/auth`).
   * On validation failure, the exception filter re-renders the signup
   * template with the error via {@link ErrorTemplate}. On success,
   * redirects to `/` (placeholder until magic link flow is wired).
   *
   * @param email - The validated email address from the form body.
   */
  @Post("signup")
  @ErrorTemplate({ BadRequestException: "signup", default: "/error" })
  @Redirect("/", HttpStatus.FOUND)
  public submitSignup(@Body() { email }: EmailDto): void {
    this.logger.log(`Sign up submitted for ${email}`)
  }

  /**
   * Exercises both modes of the exception filter via `@ErrorTemplate`.
   *
   * - `GET /error?type=render` — throws a 500, rendered as EJS error page
   * - `GET /error?type=redirect` — throws a 400, redirected to `/`
   *
   * Demonstrates per-exception routing: different exception classes
   * map to different error handling strategies on the same route.
   *
   * @param type - The error type to trigger ("render" or "redirect").
   */
  @Get("error")
  @ErrorTemplate({
    BadRequestException: "/",
    default: "errors/generic",
  })
  public error(@Query("type") type?: string): void {
    if (type === "redirect") {
      throw new BadRequestException("Invalid input")
    }
    if (type === "render") {
      throw new InternalServerErrorException("Something went wrong")
    }
    throw new BadRequestException(`Unknown error type: ${type}`)
  }
}
