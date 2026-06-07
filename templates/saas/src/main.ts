import { NestFactory } from "@nestjs/core"
import { type NestExpressApplication } from "@nestjs/platform-express"

import { ApplicationModule } from "~application/application.module"

/**
 * Bootstraps the NestJS application.
 *
 * Creates an Express-based NestJS app, enables shutdown hooks
 * for graceful termination, and listens on the configured port
 * (defaults to 3000).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(ApplicationModule, {
    bufferLogs: true,
  })

  app.enableShutdownHooks()

  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 3000)
}

void bootstrap()
