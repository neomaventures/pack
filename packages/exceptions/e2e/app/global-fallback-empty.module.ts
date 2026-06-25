import { ExceptionHandlerModule } from "@neomaventures/exceptions"
import { LoggingModule } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"
import {
  type MiddlewareConsumer,
  Module,
  type NestMiddleware,
  type NestModule,
  NotFoundException,
} from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"

class NotFoundMiddleware implements NestMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public use(_req: Request, _res: Response, _next: NextFunction): void {
    throw new NotFoundException("missing")
  }
}

@Module({
  imports: [
    RequestContextModule.forRoot(),
    LoggingModule.forRoot(),
    ExceptionHandlerModule.forRoot({}),
  ],
})
export class GlobalFallbackEmptyModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(NotFoundMiddleware).forRoutes("middleware-throws")
  }
}
