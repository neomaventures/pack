import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common"

import { ConfigModule } from "@neomaventures/config"
import { LoggingModule } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"

import { ApplicationController } from "~application/application.controller"
import { ViewLocalsMiddleware } from "~application/view-locals.middleware"

/**
 * Root application module for the SaaS template.
 *
 * Registers all top-level controllers and middlewares,
 * and serves as the entry point for the NestJS dependency
 * injection container.
 */
@Module({
  imports: [
    ConfigModule.forRoot(),
    RequestContextModule.forRoot(),
    LoggingModule.forRoot(),
  ],
  controllers: [ApplicationController],
  providers: [ViewLocalsMiddleware],
})
export class ApplicationModule implements NestModule {
  /**
   * Applies {@link ViewLocalsMiddleware} to all routes, making shared
   * variables available to EJS templates via `res.locals`.
   *
   * @param consumer - The NestJS middleware consumer.
   */
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ViewLocalsMiddleware).forRoutes("*")
  }
}
