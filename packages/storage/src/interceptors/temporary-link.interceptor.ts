import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  type NestInterceptor,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { type Response } from "express"
import { type Observable, switchMap } from "rxjs"

import {
  TEMPORARY_LINK_METADATA_KEY,
  type TemporaryLinkOptions,
} from "../decorators/temporary-link.decorator"
import { StorageService } from "../services/storage.service"
import {
  type ResolvedFeatureStorageOptions,
  RESOLVED_FEATURE_STORAGE_OPTIONS,
} from "../storage.options"

/**
 * Interceptor that generates a presigned S3 download URL and responds
 * with an HTTP 302 redirect.
 *
 * Runs post-handler only. Reads the handler's return value, which must
 * have a `key` property (implementing {@link Storable}). Calls
 * {@link StorageService.getSignedUrl} and redirects to the presigned URL.
 *
 * @example
 * ```typescript
 * @Get(":id")
 * @TemporaryLink()
 * public async download(@Param("id") id: string): Promise<Upload> {
 *   return this.repo.findOneByOrFail({ id })
 * }
 * ```
 */
@Injectable()
export class TemporaryLinkInterceptor implements NestInterceptor {
  public constructor(
    private readonly storageService: StorageService,
    private readonly reflector: Reflector,
    @Inject(RESOLVED_FEATURE_STORAGE_OPTIONS)
    private readonly options: ResolvedFeatureStorageOptions,
  ) {}

  /**
   * Intercepts the request to generate a presigned URL redirect.
   *
   * @param context - The execution context
   * @param next - The next handler in the chain
   * @returns An observable that completes after sending the redirect
   */
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const handler = context.getHandler()
    const metadata = this.reflector.get<TemporaryLinkOptions>(
      TEMPORARY_LINK_METADATA_KEY,
      handler,
    )
    const expiresIn = metadata?.expiresIn
    const defaultUrl = metadata?.default
    const cacheControl = metadata?.cacheControl ?? this.options.linkCacheControl

    const res = context.switchToHttp().getResponse<Response>()

    return next.handle().pipe(
      switchMap(async (entity: unknown) => {
        if (entity === null || entity === undefined) {
          if (defaultUrl !== undefined) {
            if (cacheControl !== undefined) {
              res.setHeader("Cache-Control", cacheControl)
            }
            res.redirect(HttpStatus.FOUND, defaultUrl)
            return
          }
          throw new InternalServerErrorException(
            "TemporaryLinkInterceptor requires the handler to return an object with a string `key` property",
          )
        }

        if (
          typeof entity !== "object" ||
          !("key" in entity) ||
          typeof (entity as any).key !== "string"
        ) {
          throw new InternalServerErrorException(
            "TemporaryLinkInterceptor requires the handler to return an object with a string `key` property",
          )
        }

        const url = await this.storageService.getSignedUrl(
          (entity as { key: string }).key,
          expiresIn,
        )

        if (cacheControl !== undefined) {
          res.setHeader("Cache-Control", cacheControl)
        }
        res.redirect(HttpStatus.FOUND, url)
      }),
    )
  }
}
