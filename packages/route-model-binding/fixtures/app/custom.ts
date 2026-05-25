import {
  RouteModelBindingConfig,
  RouteModelBindingMiddleware,
  RouteModelBindingModule,
} from "@neoma/route-model-binding"
import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AppController } from "src/app.controller"

/**
 * Creates a NestJS test application instance with custom RouteModelBinding configuration.
 *
 * @param config Optional RouteModelBinding configuration
 * @returns A {@link INestApplication} instance for e2e testing
 */
export const createCustomApp = async (
  config?: RouteModelBindingConfig,
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
  class TestAppModule implements NestModule {
    public configure(consumer: MiddlewareConsumer): void {
      consumer
        .apply(RouteModelBindingMiddleware)
        .forRoutes("/users/:user/posts/:post")
    }
  }

  const moduleFixture = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile()

  return moduleFixture.createNestApplication({
    bufferLogs: true,
  })
}

let customAppInstance: INestApplication | undefined
let customConfig: RouteModelBindingConfig | undefined

/**
 * Setup function to configure the custom app instance.
 * Call this in your test's beforeEach with your desired config.
 *
 * @param config Optional RouteModelBinding configuration
 */
export const setupCustomApp = async (
  config?: RouteModelBindingConfig,
): Promise<void> => {
  customConfig = config
  customAppInstance = await createCustomApp(customConfig)
  await customAppInstance.init()
}

beforeEach(async () => {
  // Only create app if setupCustomApp was called
  if (customConfig !== undefined) {
    customAppInstance = await createCustomApp(customConfig)
    await customAppInstance.init()
  }
})

afterEach(async () => {
  if (customAppInstance) {
    await customAppInstance.close()
    customAppInstance = undefined
    customConfig = undefined
  }
})

/**
 * Convenience function to get the custom NestJS application instance for testing.
 *
 * Note: You must call setupCustomApp in your test's beforeEach before using this.
 *
 * @returns A {@link INestApplication} instance for e2e testing
 */
export const managedCustomAppInstance = (): INestApplication => {
  if (!customAppInstance) {
    throw new Error(
      "Custom app instance not initialized. Call setupCustomApp in beforeEach.",
    )
  }
  return customAppInstance
}
