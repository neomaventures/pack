import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  Type,
} from "@nestjs/common"
import { ModuleRef, Reflector } from "@nestjs/core"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { type Request } from "express"
import { from, type Observable, switchMap, tap } from "rxjs"
import { DataSource, type DeepPartial, type Repository } from "typeorm"

import { type CerberusOptions, CERBERUS_OPTIONS } from "../cerberus.options"
import {
  UPLOAD_METADATA_KEY,
  type UploadOptions,
} from "../decorators/upload.decorator"
import { FileCreatedEvent } from "../events/file-created.event"
import { FileStoreUnreachableException } from "../exceptions/file-store-unreachable.exception"
import { FileTooLargeException } from "../exceptions/file-too-large.exception"
import { InvalidStorageKeyException } from "../exceptions/invalid-storage-key.exception"
import { NoFileProvidedException } from "../exceptions/no-file-provided.exception"
import { UnsupportedFileTypeException } from "../exceptions/unsupported-file-type.exception"
import {
  CerberusKeyResolver,
  type CerberusKeyResolverFn,
  type OriginalFileInfo,
} from "../interfaces/key-resolver.interface"
import { type Storable } from "../interfaces/storable.interface"
import { DefaultKeyResolver } from "../resolvers/default-key.resolver"
import { StorageService } from "../services/storage.service"
import { UlidIdGenerator } from "../services/ulid-id-generator.service"

/**
 * Interceptor that handles file uploads using the sandwich pattern.
 *
 * Pre-handler: Reads the file from `req.file` (parsed by {@link MultipartMiddleware}),
 * validates size/type, uploads to S3, creates an entity with Storable fields,
 * and attaches it to `req.cerberus.storedFile`.
 *
 * Post-handler: Persists the entity via `repository.save()` and returns the
 * original handler response unchanged.
 *
 * @example
 * ```typescript
 * @Post()
 * @Upload()
 * public async create(@StoredFile() file: Upload): Promise<Upload> {
 *   file.source = "form"
 *   return file
 * }
 * ```
 */
@Injectable()
export class UploadInterceptor<
  T extends Storable = Storable,
> implements NestInterceptor {
  private readonly repository: Repository<T>

  public constructor(
    @Inject(CERBERUS_OPTIONS) private readonly options: CerberusOptions<T>,
    private readonly storageService: StorageService,
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
    dataSource: DataSource,
    private readonly defaultKeyResolver: DefaultKeyResolver,
    private readonly idGenerator: UlidIdGenerator,
    private readonly moduleRef: ModuleRef,
  ) {
    this.repository = dataSource.getRepository<T>(this.options.entity)
  }

  /**
   * Intercepts the request to handle file upload lifecycle.
   *
   * @param context - The execution context
   * @param next - The next handler in the chain
   * @returns An observable that emits the handler's response after entity persistence
   */
  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>()
    const handler = context.getHandler()

    const uploadOptions = this.reflector.get<UploadOptions>(
      UPLOAD_METADATA_KEY,
      handler,
    )!

    const { file } = req
    if (!file) {
      throw new NoFileProvidedException()
    }

    this.validateFile(file, uploadOptions)

    const fileInfo: OriginalFileInfo = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }

    let key = this.defaultKeyResolver.resolve(req, this.idGenerator, fileInfo)

    if (uploadOptions.key) {
      const fileInfoWithDefault = { ...fileInfo, defaultKey: key }
      // Classes implementing CerberusKeyResolver have `resolve` on their prototype;
      // plain functions (including arrow functions) do not.
      if (uploadOptions.key.prototype?.resolve) {
        const resolver = this.moduleRef.get(
          uploadOptions.key as Type<CerberusKeyResolver>,
          { strict: false },
        )
        key = resolver.resolve(req, this.idGenerator, fileInfoWithDefault)
      } else {
        key = (uploadOptions.key as CerberusKeyResolverFn)(
          req,
          this.idGenerator,
          fileInfoWithDefault,
        )
      }
    }

    try {
      await this.storageService.store(key, file.buffer, file.mimetype)
    } catch (error: unknown) {
      if (error instanceof InvalidStorageKeyException) {
        throw error
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new FileStoreUnreachableException(
        this.options.endpoint,
        this.options.bucket,
        message,
      )
    }

    const entity = this.repository.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      key,
      bucket: this.options.bucket,
    } as DeepPartial<T>)

    req.cerberus = { ...req.cerberus, storedFile: entity as Storable }

    return next.handle().pipe(
      switchMap((response) =>
        from(this.repository.save(entity)).pipe(
          tap((savedEntity) => {
            try {
              this.eventEmitter.emit(
                FileCreatedEvent.EVENT_NAME,
                new FileCreatedEvent(savedEntity),
              )
            } catch {
              // Fire-and-forget — listener errors must not fail the upload response
            }
          }),
          switchMap(() => [response]),
        ),
      ),
    )
  }

  /**
   * Validates the uploaded file against configured constraints.
   *
   * Size: checks per-route `maxSize` first, then global `maxFileSize`.
   * Types: checks the intersection of global `allowedMimeTypes` and per-route `types`.
   *
   * @param file - The multer file to validate
   * @param uploadOptions - Per-route upload options from the `@Upload()` decorator
   * @throws {FileTooLargeException} If the file exceeds maxFileSize or per-route maxSize
   * @throws {UnsupportedFileTypeException} If the file type is not in the allowed set
   */
  private validateFile(
    file: Express.Multer.File,
    uploadOptions: UploadOptions,
  ): void {
    if (
      uploadOptions.maxSize !== undefined &&
      file.size > uploadOptions.maxSize
    ) {
      throw new FileTooLargeException(file.size, uploadOptions.maxSize)
    }

    if (
      this.options.maxFileSize !== undefined &&
      file.size > this.options.maxFileSize
    ) {
      throw new FileTooLargeException(file.size, this.options.maxFileSize)
    }

    const globalTypes = this.options.allowedMimeTypes
    const routeTypes = uploadOptions.types

    if (
      globalTypes !== undefined &&
      globalTypes.length > 0 &&
      !globalTypes.includes(file.mimetype)
    ) {
      throw new UnsupportedFileTypeException(file.mimetype, globalTypes)
    }

    if (
      routeTypes !== undefined &&
      routeTypes.length > 0 &&
      !routeTypes.includes(file.mimetype)
    ) {
      throw new UnsupportedFileTypeException(file.mimetype, routeTypes)
    }
  }
}
