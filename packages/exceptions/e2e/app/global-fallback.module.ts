import {
  ErrorTemplate,
  ExceptionHandlerModule,
  NeomaException,
} from "@neomaventures/exceptions"
import { LoggingModule } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"
import {
  BadRequestException,
  Controller,
  HttpException,
  HttpStatus,
  type MiddlewareConsumer,
  Module,
  type NestMiddleware,
  type NestModule,
  NotFoundException,
  Post,
} from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"

class RedirectableException extends Error implements NeomaException {
  public constructor() {
    super("Unauthenticated")
    this.name = "RedirectableException"
  }

  public getStatus(): number {
    return HttpStatus.UNAUTHORIZED
  }

  public getResponse(): object {
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      message: "Unauthenticated",
      error: "Unauthorized",
    }
  }

  public getRedirect(): { status: number; url: string } {
    return { status: HttpStatus.SEE_OTHER, url: "/login" }
  }
}

class NotFoundMiddleware implements NestMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public use(_req: Request, _res: Response, _next: NextFunction): void {
    throw new NotFoundException("missing")
  }
}

class UnhandledErrorMiddleware implements NestMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public use(_req: Request, _res: Response, _next: NextFunction): void {
    throw new Error("boom")
  }
}

@Controller()
class GlobalFallbackController {
  @ErrorTemplate({ default: "route-template" })
  @Post("with-route-template")
  public withRouteTemplate(): void {
    throw new BadRequestException("Bad request")
  }

  @Post("with-redirect")
  public withRedirect(): void {
    throw new RedirectableException()
  }

  @Post("plain-bad-request")
  public plainBadRequest(): void {
    throw new BadRequestException("Bad request")
  }

  @Post("teapot")
  public teapot(): void {
    throw new HttpException("I am a teapot", HttpStatus.I_AM_A_TEAPOT)
  }
}

@Module({
  imports: [
    RequestContextModule.forRoot(),
    LoggingModule.forRoot(),
    ExceptionHandlerModule.forRoot({
      errorTemplates: {
        default: "global-default",
        [HttpStatus.NOT_FOUND]: "global-404",
        [HttpStatus.INTERNAL_SERVER_ERROR]: "global-500",
        [HttpStatus.I_AM_A_TEAPOT]: "/teapot",
      },
    }),
  ],
  controllers: [GlobalFallbackController],
})
export class GlobalFallbackModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(NotFoundMiddleware).forRoutes("middleware-throws")
    consumer
      .apply(UnhandledErrorMiddleware)
      .forRoutes("middleware-throws-unknown")
  }
}
