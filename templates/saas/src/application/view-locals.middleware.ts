import { GoogleAuthService } from "@neomaventures/auth"
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
  /** Cached Google authorize URL, or `null` when Google OAuth is not configured. */
  private readonly googleAuthorizeUrl: string | null

  /**
   * Constructs the middleware with injected configuration.
   *
   * @param config - The configuration object containing view-related environment variables.
   * @param googleAuthService - The Google OAuth service for building the authorize URL.
   */
  public constructor(
    @InjectConfig()
    private readonly config: TypedConfig<ViewConfig>,
    private readonly googleAuthService: GoogleAuthService,
  ) {
    this.googleAuthorizeUrl =
      this.googleAuthService.authorizeUrl?.toString() ?? null
  }

  /**
   * Middleware function that sets shared view locals on `res.locals`.
   * This makes the package name, version, and Google authorize URL
   * available to all EJS templates.
   *
   * @param _req - The incoming HTTP request (unused).
   * @param res - The HTTP response object, where `res.locals` will be modified.
   * @param next - The next middleware function in the chain.
   */
  public use(_req: Request, res: Response, next: NextFunction): void {
    res.locals.npmPackageName = this.config.npmPackageName
    res.locals.npmPackageVersion = this.config.npmPackageVersion
    res.locals.googleAuthorizeUrl = this.googleAuthorizeUrl
    next()
  }
}
