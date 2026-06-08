import { join } from "path"

import { NestFactory } from "@nestjs/core"
import { type NestExpressApplication } from "@nestjs/platform-express"

import { ApplicationModule } from "~application/application.module"

/**
 * Bootstraps the NestJS application.
 *
 * Creates an Express-based NestJS app, configures EJS as the view
 * engine with static asset serving, enables shutdown hooks for
 * graceful termination, and listens on the configured port
 * (defaults to 3000).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    {
      bufferLogs: true,
    },
  )

  app.enableShutdownHooks()

  app.useStaticAssets(join(process.cwd(), "public"))
  app.setBaseViewsDir(join(process.cwd(), "views"))
  app.setViewEngine("ejs")

  const port = Number(process.env.PORT) || 3000

  await app.listen(port)
}

void bootstrap()
