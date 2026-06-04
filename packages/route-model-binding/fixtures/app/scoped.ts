import {
  RouteModelBindingConfig,
  RouteModelBindingMiddleware,
  RouteModelBindingModule,
  type ScopeAccessor,
  type ScopeContext,
} from "@neomaventures/route-model-binding"
import {
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AppController } from "src/app.controller"

/**
 * A scope accessor that always allows access.
 */
@Injectable()
export class AllowAllAccessor implements ScopeAccessor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public canAccess(_context: ScopeContext): boolean {
    return true
  }
}

/**
 * A scope accessor that always denies access.
 */
@Injectable()
export class DenyAllAccessor implements ScopeAccessor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public canAccess(_context: ScopeContext): boolean {
    return false
  }
}

/**
 * A scope accessor that records each call for inspection.
 */
@Injectable()
export class SpyAccessor implements ScopeAccessor {
  public static calls: ScopeContext[] = []

  public canAccess(context: ScopeContext): boolean {
    SpyAccessor.calls.push(context)
    return true
  }
}

/**
 * Creates a NestJS test application instance with scoped RouteModelBinding configuration.
 *
 * @param config RouteModelBinding configuration including scope
 * @returns A {@link INestApplication} instance for e2e testing
 */
export const createScopedApp = async (
  config: RouteModelBindingConfig,
): Promise<INestApplication> => {
  @Module({
    imports: [
      TypeOrmModule.forRoot({
        type: "sqlite",
        database: ":memory:",
        entities: ["e2e/app/**/*.entity.ts"],
        synchronize: true,
      }),
      RouteModelBindingModule.forRoot(config),
    ],
    controllers: [AppController],
  })
  class ScopedAppModule implements NestModule {
    public configure(consumer: MiddlewareConsumer): void {
      consumer
        .apply(RouteModelBindingMiddleware)
        .forRoutes("/users/:user/posts/:post")
    }
  }

  const moduleFixture = await Test.createTestingModule({
    imports: [ScopedAppModule],
  }).compile()

  return moduleFixture.createNestApplication({
    bufferLogs: true,
  })
}

let scopedAppInstance: INestApplication | undefined

/**
 * Setup function to create and initialize a scoped app instance.
 *
 * @param config RouteModelBinding configuration including scope
 */
export const setupScopedApp = async (
  config: RouteModelBindingConfig,
): Promise<void> => {
  scopedAppInstance = await createScopedApp(config)
  await scopedAppInstance.init()
}

afterEach(async () => {
  if (scopedAppInstance) {
    await scopedAppInstance.close()
    scopedAppInstance = undefined
  }
})

/**
 * Convenience function to get the scoped NestJS application instance for testing.
 *
 * @returns A {@link INestApplication} instance for e2e testing
 */
export const managedScopedAppInstance = (): INestApplication => {
  if (!scopedAppInstance) {
    throw new Error(
      "Scoped app instance not initialized. Call setupScopedApp in beforeEach.",
    )
  }
  return scopedAppInstance
}
