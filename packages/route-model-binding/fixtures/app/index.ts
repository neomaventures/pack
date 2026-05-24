import { type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { AppModule } from "src/app.module"

/**
 * Creates a NestJS test application instance that loads the AppModule.
 *
 * @returns A {@link INestApplication} instance for e2e testing.
 */
export const nestJsApp = async (): Promise<INestApplication> => {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  return moduleFixture.createNestApplication({
    bufferLogs: true,
  })
}

let appInstance: INestApplication
beforeEach(async () => {
  appInstance = await nestJsApp()
  await appInstance.init()
})

afterEach(async () => {
  await appInstance.close()
})

/**
 * Convenience function to get the NestJS application instance for testing.
 *
 * Note: The application instance's lifecycle is managed by beforeEach and
 * afterEach hooks that are automatically added to Jest when this module is
 * imported.
 *
 * @returns A {@link INestApplication} instance for e2e testing.
 */
export const managedAppInstance = (): INestApplication => appInstance
