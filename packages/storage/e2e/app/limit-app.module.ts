import { AsyncLocalStorage } from "node:async_hooks"

import {
  StorageModule,
  Upload as UploadDecorator,
} from "@neomaventures/storage"
import {
  type CanActivate,
  Controller,
  type ExecutionContext,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { Upload } from "./upload.entity"

/**
 * Per-request `AsyncLocalStorage` instance used by the per-route over-limit
 * regression spec at `e2e/core/upload/limit-als-propagation.e2e-spec.ts`.
 *
 * Companion to `als` in `als-bug-app.module.ts` — that fixture covers the
 * success path (multer parses, controller reads the frame). This one covers
 * the **per-route `@Upload({ maxSize })` over-limit path** where multer
 * parses the full body but the storage interceptor rejects post-parse —
 * exactly the topology the saas avatar route uses.
 */
export const limitAls: AsyncLocalStorage<{ principal: string }> =
  new AsyncLocalStorage<{ principal: string }>()

/**
 * Guard mirroring the shape of consumer guards that read a principal from
 * ALS (e.g. the saas template's `AssetAuthenticated`). When the frame is
 * missing it raises 404 — so a 404 on the over-limit case indicates the
 * frame was dropped during multer's parse, while a 413 indicates the frame
 * survived and the interceptor's size check fired as designed.
 */
@Injectable()
export class PrincipalRequiredGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public canActivate(_context: ExecutionContext): boolean {
    if (!limitAls.getStore()?.principal) {
      throw new NotFoundException()
    }
    return true
  }
}

/**
 * Asset endpoint guarded by {@link PrincipalRequiredGuard} and decorated
 * with a per-route 3MB `@Upload({ maxSize })` limit — the exact decorator
 * shape used by the saas avatar route. No module-level `maxFileSize` is
 * configured, so multer always parses the full body and the interceptor
 * does the size check; the guard reads ALS before the interceptor runs.
 */
@Controller("limit")
export class LimitController {
  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PrincipalRequiredGuard)
  @UploadDecorator({ maxSize: 3_000_000 })
  public upload(): { ok: true } {
    return { ok: true }
  }
}

/**
 * Minimal app for the per-route over-limit ALS regression spec. Module-level
 * `maxFileSize` is intentionally **omitted** so multer parses the entire
 * body (matching the saas avatar topology); the per-route `maxSize` is
 * enforced post-parse by the storage interceptor.
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
  controllers: [LimitController],
  providers: [PrincipalRequiredGuard],
})
export class LimitAppModule {}
