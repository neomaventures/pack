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
 */
@Injectable()
export class ViewLocalsMiddleware implements NestMiddleware {
  /**
   * Constructs the middleware with injected configuration.
   *
   * @param config - The configuration object containing view-related environment variables.
   * @param config.npmPackageName - The package name from npm package metadata.
   * @param config.npmPackageVersion - The application version from npm package metadata.
   */
  public constructor(
    @InjectConfig()
    private readonly config: TypedConfig<ViewConfig>,
  ) {}

  /**
   * Middleware function that sets shared view locals on `res.locals`.
   * This makes the package name and version available to all EJS templates.
   *
   * @param _req - The incoming HTTP request (unused).
   * @param res - The HTTP response object, where `res.locals` will be modified.
   * @param next - The next middleware function in the chain.
   *
   * @returns void
   */
  public use(_req: Request, res: Response, next: NextFunction): void {
    res.locals.npmPackageName = this.config.npmPackageName
    res.locals.npmPackageVersion = this.config.npmPackageVersion
    next()
  }
}
