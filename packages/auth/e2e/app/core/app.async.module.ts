import { LoggingModule } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import {
  Account,
  AuthModule,
  AuthOptions,
  OAuthToken,
} from "@neomaventures/auth"

import { GoogleAuthController } from "./google-auth.controller"
import { LogoutController } from "./logout.controller"
import { MagicLinkController } from "./magic-link.controller"
import { MeController } from "./me.controller"
import { OnUnauthenticatedController } from "./on-unauthenticated.controller"
import { AdminController, ProtectedController } from "./protected.controller"

@Module({
  imports: [
    RequestContextModule.forRoot(),
    LoggingModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [Account, OAuthToken],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Account, OAuthToken]),
    AuthModule.forRootAsync({
      useFactory: (): AuthOptions => ({
        secret: process.env.AUTH_SECRET!,
        expiresIn: "1h",
        magicLink: {
          mailer: {
            host: process.env.SMTP_HOST!,
            port: parseInt(process.env.SMTP_PORT!),
            from: process.env.MAGIC_LINK_FROM!,
            welcome: {
              subject: process.env.MAGIC_LINK_WELCOME_SUBJECT!,
              html: `<a href="${process.env.APP_URL!}/magic-link/verify?token={{token}}">Sign up</a>`,
            },
            welcomeBack: {
              subject: process.env.MAGIC_LINK_WELCOME_BACK_SUBJECT!,
              html: `<a href="${process.env.APP_URL!}/magic-link/verify?token={{token}}">Sign in</a>`,
            },
            auth: {
              user: process.env.MAILPIT_AUTH_USER!,
              pass: process.env.MAILPIT_AUTH_PASS!,
            },
          },
        },
        googleAuth: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectUri: process.env.GOOGLE_REDIRECT_URI!,
          tokenEndpoint: process.env.GOOGLE_TOKEN_ENDPOINT,
        },
      }),
    }),
  ],
  controllers: [
    GoogleAuthController,
    LogoutController,
    MagicLinkController,
    MeController,
    OnUnauthenticatedController,
    ProtectedController,
    AdminController,
  ],
})
export class AsyncAppModule {}
