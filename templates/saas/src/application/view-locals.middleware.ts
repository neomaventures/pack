import { InjectConfig, type TypedConfig } from "@neomaventures/config"
import { Injectable, type NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"

/** Environment variables used by view templates. */
interface ViewConfig {
  /** Package name from npm package metadata. */
  npmPackageName: string

  /** Application version from npm package metadata. */
  npmPackageVersion: string
}

/**
 * Sets shared view locals available to all EJS templates.
 *
 * Injects the following variables into `res.locals` on every request:
 * - `appName` — the package name from `NPM_PACKAGE_NAME`
 * - `version` — the application version from `NPM_PACKAGE_VERSION`
 */
@Injectable()
export class ViewLocalsMiddleware implements NestMiddleware {
  public constructor(
    @InjectConfig()
    private readonly config: TypedConfig<ViewConfig>,
  ) {}

  public use(_req: Request, res: Response, next: NextFunction): void {
    res.locals.npmPackageName = this.config.npmPackageName
    res.locals.npmPackageVersion = this.config.npmPackageVersion
    next()
  }
}
