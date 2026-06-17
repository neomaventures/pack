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
import { type Observable } from "rxjs"
import { DataSource, type DeepPartial, type Repository } from "typeorm"

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
  StorageKeyResolver,
  type StorageKeyResolverFn,
  type OriginalFileInfo,
} from "../interfaces/key-resolver.interface"
import { type Storable } from "../interfaces/storable.interface"
import { DefaultKeyResolver } from "../resolvers/default-key.resolver"
import { StorageService } from "../services/storage.service"
import { UlidIdGenerator } from "../services/ulid-id-generator.service"
import {
  type ResolvedFeatureStorageOptions,
  type ResolvedStorageRootOptions,
  RESOLVED_FEATURE_STORAGE_OPTIONS,
  RESOLVED_STORAGE_OPTIONS,
} from "../storage.options"

/**
 * Interceptor that handles file uploads with pre-handler persistence.
 *
 * Pre-handler: Reads the file from `req.file` (parsed by {@link MultipartMiddleware}),
 * validates size/type, uploads to S3, creates and **persists** the entity, emits a
 * {@link FileCreatedEvent}, and attaches the persisted entity to `req.storage.storedFile`.
 *
 * The consumer handler runs after the entity already has an `id` and exists in the
 * database, so it can be referenced by foreign keys created within the handler. The
 * handler is responsible for any further mutation/save; the interceptor performs no
 * post-handler persistence.
 *
 * If the consumer handler throws, the persisted row and S3 object are left in place
 * (orphan accepted). Listeners of {@link FileCreatedEvent} must not assume that any
 * consumer-side foreign key wiring has happened yet.
 *
 * @example
 * ```typescript
 * @Post()
 * @Upload()
 * public async create(@StoredFile() file: Upload): Promise<Upload> {
 *   // `file.id` is already set; row already exists in DB.
 *   file.source = "form"
 *   return this.uploads.save(file)
 * }
 * ```
 */
@Injectable()
export class UploadInterceptor<
  T extends Storable = Storable,
> implements NestInterceptor {
  private readonly repository: Repository<T>

  public constructor(
    @Inject(RESOLVED_FEATURE_STORAGE_OPTIONS)
    private readonly options: ResolvedFeatureStorageOptions,
    @Inject(RESOLVED_STORAGE_OPTIONS)
    private readonly rootOptions: ResolvedStorageRootOptions<T>,
    private readonly storageService: StorageService,
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
    dataSource: DataSource,
    private readonly defaultKeyResolver: DefaultKeyResolver,
    private readonly idGenerator: UlidIdGenerator,
    private readonly moduleRef: ModuleRef,
  ) {
    this.repository = dataSource.getRepository<T>(this.rootOptions.entity)
  }

  /**
   * Intercepts the request to handle file upload lifecycle.
   *
   * @param context - The execution context
   * @param next - The next handler in the chain
   * @returns An observable that emits the handler's response unchanged
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
      // Classes implementing StorageKeyResolver have `resolve` on their prototype;
      // plain functions (including arrow functions) do not.
      if (uploadOptions.key.prototype?.resolve) {
        const resolver = this.moduleRef.get(
          uploadOptions.key as Type<StorageKeyResolver>,
          { strict: false },
        )
        key = resolver.resolve(req, this.idGenerator, fileInfoWithDefault)
      } else {
        key = (uploadOptions.key as StorageKeyResolverFn)(
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
        this.rootOptions.endpoint,
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

    const savedEntity = await this.repository.save(entity)

    req.storage = { ...req.storage, storedFile: savedEntity as Storable }

    try {
      this.eventEmitter.emit(
        FileCreatedEvent.EVENT_NAME,
        new FileCreatedEvent(savedEntity),
      )
    } catch {
      // Fire-and-forget — listener errors must not fail the upload response
    }

    return next.handle()
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
