import { AuthModule } from "@neomaventures/auth"
import {
  ConfigModule,
  ConfigService,
  type TypedConfig,
} from "@neomaventures/config"
import { ExceptionHandlerModule } from "@neomaventures/exceptions"
import { HealthcheckModule } from "@neomaventures/healthcheck"
import { LoggingModule } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"
import { StorageModule } from "@neomaventures/storage"
import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common"

import { ApplicationController } from "~application/application.controller"
import { ViewLocalsMiddleware } from "~application/view-locals.middleware"
import { SaasAuthModule } from "~auth/auth.module"
import { Upload } from "~auth/upload.entity"
import { DashboardModule } from "~dashboard/dashboard.module"
import { DatabaseModule } from "~database/database.module"

/**
 * Typed view onto the environment variables the application module reads
 * at boot. Resolved from `@neomaventures/config` via `ConfigService`.
 */
interface AppConfig {
  /** HMAC secret used by `@neomaventures/auth` to sign session cookies. */
  jwtSecret: string

  /** SMTP server hostname for outbound mail (magic-link delivery). */
  smtpHost: string
  /** SMTP server port, as a string from env. Parsed with `parseInt(..., 10)`. */
  smtpPort: string
  /** SMTP auth username. Omit (alongside `smtpPassword`) for unauthenticated SMTP — useful for Mailpit / Mailhog in dev. */
  smtpUser: string
  /** SMTP auth password. Omit (alongside `smtpUser`) for unauthenticated SMTP. */
  smtpPassword: string
  /** `From:` address used on outbound auth emails. */
  mailFrom: string

  /** Public-facing base URL of the app. Used to build absolute auth callback URLs and to derive cookie `secure` mode. */
  appUrl: string

  /** Google OAuth client id. When absent, Google sign-in is not registered. */
  googleClientId: string
  /** Google OAuth client secret. Required alongside `googleClientId`. */
  googleClientSecret: string
  /** Optional override for Google's token endpoint URL. Used in tests to point at a mocked endpoint; production reads from Google. */
  googleTokenEndpoint: string

  /** S3-compatible endpoint for `@neomaventures/storage` (MinIO locally, real S3/R2/B2 in production). */
  s3Endpoint: string
  /** AWS region passed to the S3 SDK. MinIO ignores it but the SDK still requires a value. */
  s3Region: string
  /** Bucket name avatar uploads are written to. */
  avatarBucket: string
  /** S3 access key id. */
  s3AccessKeyId: string
  /** S3 secret access key. */
  s3SecretAccessKey: string
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
    ExceptionHandlerModule.forRoot({}),
    HealthcheckModule.forRoot(),
    DatabaseModule,
    AuthModule.forRootAsync({
      useFactory: (config: TypedConfig<AppConfig>) => ({
        secret: config.jwtSecret,
        expiresIn: "7d",
        onUnauthenticated: "/auth/register",
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
    StorageModule.forRootAsync({
      useFactory: (config: TypedConfig<AppConfig>) => ({
        endpoint: config.s3Endpoint,
        region: config.s3Region,
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
        entity: Upload,
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
