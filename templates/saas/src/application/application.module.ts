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

import { ApplicationController } from "~application/application.controller"
import { ViewLocalsMiddleware } from "~application/view-locals.middleware"
import { Account } from "~auth/account.entity"
import { SaasAuthModule } from "~auth/auth.module"
import { DashboardModule } from "~dashboard/dashboard.module"
import { DatabaseModule } from "~database/database.module"

/** Config properties used by the application module. */
interface AppConfig {
  jwtSecret: string
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  mailFrom: string
  appUrl: string
  googleClientId: string
  googleClientSecret: string
  googleTokenEndpoint: string
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
    DatabaseModule,
    AuthModule.forRootAsync({
      useFactory: (config: TypedConfig<AppConfig>) => ({
        secret: config.jwtSecret,
        expiresIn: "7d",
        entity: Account,
        cookie: {
          secure: config.appUrl.startsWith("https"),
          sameSite: "lax" as const,
        },
        magicLink: {
          mailer: {
            host: config.smtpHost,
            port: parseInt(config.smtpPort, 10),
            from: config.mailFrom,
            auth:
              config.smtpUser && config.smtpPassword
                ? { user: config.smtpUser, pass: config.smtpPassword }
                : undefined,
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
        ...(config.googleClientId && {
          googleAuth: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
            redirectUri: `${config.appUrl}/auth/google/callback`,
            ...(config.googleTokenEndpoint && {
              tokenEndpoint: config.googleTokenEndpoint,
            }),
          },
        }),
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
