import { AuthModule } from "@neomaventures/auth"
import {
  ConfigModule,
  ConfigService,
  type TypedConfig,
} from "@neomaventures/config"
import { ExceptionHandlerModule } from "@neomaventures/exceptions"
import { LoggingModule } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"
import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { ApplicationController } from "~application/application.controller"
import { ViewLocalsMiddleware } from "~application/view-locals.middleware"
import { Account } from "~auth/account.entity"
import { SaasAuthModule } from "~auth/auth.module"
import { DashboardModule } from "~dashboard/dashboard.module"

/** Config properties used by the application module. */
interface AppConfig {
  jwtSecret: string
  smtpHost: string
  smtpPort: string
  mailFrom: string
  appUrl: string
}

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
    ExceptionHandlerModule,
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule.forRootAsync({
      useFactory: (config: TypedConfig<AppConfig>) => ({
        secret: config.jwtSecret,
        expiresIn: "7d",
        entity: Account,
        cookie: {
          secure: false,
          sameSite: "lax" as const,
        },
        magicLink: {
          mailer: {
            host: config.smtpHost,
            port: parseInt(config.smtpPort, 10),
            from: config.mailFrom,
            welcome: {
              subject: "Welcome — confirm your email",
              html: `<p>Click <a href="${config.appUrl}/auth/magic-link/callback?token={{token}}">here</a> to sign in.</p>`,
            },
            welcomeBack: {
              subject: "Welcome back — sign in",
              html: `<p>Click <a href="${config.appUrl}/auth/magic-link/callback?token={{token}}">here</a> to sign in.</p>`,
            },
          },
        },
      }),
      inject: [ConfigService],
    }),
    SaasAuthModule,
    DashboardModule,
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
