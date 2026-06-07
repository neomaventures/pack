import { ErrorTemplate } from "@neomaventures/exceptions"
import { ApplicationLoggerService } from "@neomaventures/logging"
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Query,
  Render,
  Res,
} from "@nestjs/common"
import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"
import { type Response } from "express"

import { SignupDto } from "~application/signup.dto"

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
   * Validates the email address from the form body. On validation failure,
   * re-renders the sign-up page with the error messages and the submitted
   * email preserved. On success, redirects to the home page.
   *
   * @param body - The raw form body containing the email field.
   * @param res - The Express response object for rendering and redirecting.
   */
  @Post("signup")
  @HttpCode(HttpStatus.BAD_REQUEST)
  public async submitSignup(
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const dto = plainToInstance(SignupDto, body)
    const errors = await validate(dto, { stopAtFirstError: true })

    if (errors.length > 0) {
      const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}))

      this.logger.log("Sign up validation failed")
      res.status(HttpStatus.BAD_REQUEST).render("signup", {
        errors: messages,
        email: typeof body.email === "string" ? body.email : "",
      })
      return
    }

    this.logger.log("Sign up submitted")
    res.redirect(HttpStatus.FOUND, "/")
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
