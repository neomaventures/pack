import { GarmrModule, GarmrOptions } from "@neoma/garmr"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { User } from "../user.entity"

import { GoogleAuthController } from "./google-auth.controller"
import { LogoutController } from "./logout.controller"
import { MagicLinkController } from "./magic-link.controller"
import { MeController } from "./me.controller"
import { AdminController, ProtectedController } from "./protected.controller"
import { WebhookController } from "./webhook.controller"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [User],
      synchronize: true,
    }),
    GarmrModule.forRootAsync({
      useFactory: (): GarmrOptions<User> => ({
        secret: process.env.GARMR_SECRET!,
        expiresIn: "1h",
        entity: User,
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
        webhook: {
          secret: process.env.WEBHOOK_SECRET!,
        },
      }),
    }),
  ],
  controllers: [
    GoogleAuthController,
    LogoutController,
    MagicLinkController,
    MeController,
    ProtectedController,
    AdminController,
    WebhookController,
  ],
})
export class AsyncAppModule {}
