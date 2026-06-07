import { join } from "path"

import { type INestApplication } from "@nestjs/common"
import { type NestExpressApplication } from "@nestjs/platform-express"

/**
 * Configures the view engine, views directory, and static assets for e2e testing.
 */
export function configureViewEngine(app: INestApplication): void {
  const expressApp = app as unknown as NestExpressApplication
  expressApp.useStaticAssets(join(process.cwd(), "public"))
  expressApp.setBaseViewsDir(join(process.cwd(), "views"))
  expressApp.setViewEngine("ejs")
}
