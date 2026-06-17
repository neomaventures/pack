import { AsyncLocalStorage } from "node:async_hooks"

import { StorageModule } from "@neomaventures/storage"
import { Controller, Module, Post } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { Upload } from "./upload.entity"

/**
 * Per-request `AsyncLocalStorage` instance used by the regression spec to
 * verify that `MultipartMiddleware` does not drop the caller's ALS frame
 * across multer's deferred callback. Exported so the spec's `configure`
 * callback can open the frame in an `app.use(...)` middleware.
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
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      entity: Upload,
    }),
    StorageModule.forFeature({
      bucket: process.env.STORAGE_BUCKET!,
    }),
  ],
  controllers: [AlsBugController],
})
export class AlsBugAppModule {}
