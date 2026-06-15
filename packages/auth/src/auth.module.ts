import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"

import { ConfigurableModuleClass } from "./auth.module-definition"
import { BearerAuthenticationMiddleware } from "./middlewares/bearer-authentication.middleware"
import { CookieAuthenticationMiddleware } from "./middlewares/cookie-authentication.middleware"

/**
 * Passwordless authentication module for NestJS applications.
 *
 * @requires TypeOrmModule must be configured in your application.
 *
 * @example Static configuration
 * ```typescript
 * AuthModule.forRoot({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: '1h',
 *   magicLink: { mailer: { ... } },
 * })
 * ```
 *
 * @example Async configuration via DI
 * ```typescript
 * AuthModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     secret: config.get('JWT_SECRET'),
 *     expiresIn: '1h',
 *     magicLink: { mailer: { ... } },
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class AuthModule extends ConfigurableModuleClass implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(BearerAuthenticationMiddleware, CookieAuthenticationMiddleware)
      .forRoutes("*")
  }
}
