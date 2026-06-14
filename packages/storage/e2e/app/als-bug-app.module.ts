import { AsyncLocalStorage } from "node:async_hooks"

import { StorageModule } from "@neomaventures/storage"
import {
  Controller,
  Injectable,
  type MiddlewareConsumer,
  Module,
  type NestMiddleware,
  type NestModule,
  Post,
} from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { type NextFunction, type Request, type Response } from "express"

import { Upload } from "./upload.entity"

/**
 * Per-request `AsyncLocalStorage` instance used by the regression spec to
 * verify that `MultipartMiddleware` does not drop the caller's ALS frame
 * across multer's deferred callback. Opened by {@link MarkerMiddleware}
 * for every incoming request.
 */
export const als: AsyncLocalStorage<{ marker: string }> =
  new AsyncLocalStorage<{ marker: string }>()

/**
 * Reads the ALS marker that the upstream middleware wrote, after multer has
 * parsed the multipart body. Returns the marker in the response so the spec
 * can assert it survived the parse.
 */
@Controller("als")
export class AlsBugController {
  @Post("upload")
  public upload(): { markerFromAls: string | undefined } {
    return { markerFromAls: als.getStore()?.marker }
  }
}

/**
 * Opens the per-request ALS frame as a Nest middleware. Mirrors the
 * production topology where `@neomaventures/request-context` opens its
 * frame in a Nest middleware registered via
 * `consumer.apply(...).forRoutes("*")` — rather than via `app.use(...)`
 * at the Express boundary — so the regression spec exercises the same
 * Nest middleware ordering that the saas template runs under.
 */
@Injectable()
export class MarkerMiddleware implements NestMiddleware {
  public use(req: Request, _res: Response, next: NextFunction): void {
    const marker = (req.headers["x-test-marker"] as string) ?? "missing"
    als.run({ marker }, () => next())
  }
}

/**
 * Minimal app for the regression spec at
 * `e2e/core/upload/als-propagation.e2e-spec.ts`.
 *
 * No global `maxFileSize` — we want multer to parse the full body so we can
 * observe whether ALS survives the parse, not whether multer short-circuits
 * at the limit. The upload entity is shared with the other e2e app modules.
 */

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [Upload],
      synchronize: true,
    }),
    StorageModule.forRoot({
      endpoint: process.env.STORAGE_ENDPOINT!,
      region: process.env.STORAGE_REGION!,
      bucket: process.env.STORAGE_BUCKET!,
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      entity: Upload,
    }),
  ],
  controllers: [AlsBugController],
  providers: [MarkerMiddleware],
})
export class AlsBugAppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MarkerMiddleware).forRoutes("*")
  }
}
