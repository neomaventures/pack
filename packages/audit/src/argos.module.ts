import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"

import { ConfigurableModuleClass } from "./argos.module-definition"
import { ActorMiddleware } from "./middlewares/actor.middleware"

/**
 * Audit module that tracks who performed entity changes.
 *
 * Registers ALS middleware to resolve the actor per request
 * and powers the `@CreatedBy()` / `@UpdatedBy()` decorators.
 *
 * @example Static configuration
 * ```typescript
 * ArgosModule.forRoot({
 *   resolveActor: (req) =>
 *     req.principal ? `principal:${req.principal.id}` : null,
 * })
 * ```
 *
 * @example Async configuration with injected dependencies
 * ```typescript
 * ArgosModule.forRootAsync({
 *   useFactory: (config: ConfigService) => ({
 *     defaultActor: config.get("ARGOS_DEFAULT_ACTOR", "system"),
 *     resolveActor: (req) =>
 *       req.principal ? `principal:${req.principal.id}` : null,
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class ArgosModule extends ConfigurableModuleClass implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ActorMiddleware).forRoutes("*")
  }
}
