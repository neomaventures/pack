# @neomaventures/storage

NestJS-idiomatic file storage for S3-compatible backends.

Storage handles the file upload lifecycle: store to S3, persist metadata to your entity, and generate presigned download URLs — all through interceptors and decorators that compose naturally with NestJS controllers.

The module splits into two pieces:

- `StorageModule.forRoot({...})` — global; configures the S3 connection and binds the consumer's `Storable` entity for persistence.
- `StorageModule.forFeature({ bucket })` — local; configures a bucket and provides a `StorageService` / `UploadInterceptor` instance scoped to the importing module.

Single-bucket apps register one `forFeature` in the root module. Multi-bucket apps register a `forFeature` per feature module (avatars, attachments, exports) and each gets its own service instance bound to its own bucket.

## Installation

`@neomaventures/*` packages publish privately to GitHub Packages. Configure `.npmrc` to resolve the `@neomaventures` scope first:

```
@neomaventures:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
npm install @neomaventures/storage
```

### Peer dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express \
  @nestjs/typeorm @nestjs/event-emitter typeorm reflect-metadata rxjs
```

## Entity model — interface and your own entity

Storage defines one TypeScript contract — `Storable` — and the consumer always owns the entity class. No reference entity ships from the package; the entity carries consumer-owned relations (`Account.avatars`, `Message.attachments`), so it lives in the consumer codebase.

```typescript
import { type Storable } from "@neomaventures/storage"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Upload implements Storable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public originalName!: string

  @Column()
  public mimeType!: string

  @Column()
  public size!: number

  @Column()
  public key!: string

  @Column()
  public bucket!: string

  // Add your own columns — consumer relations live here
  @Column({ nullable: true })
  public source?: string
}
```

The consumer always owns `TypeOrmModule.forFeature([Upload])` registration — storage never touches DataSource or migration files.

## Getting started — single-bucket app

Most apps start with one bucket. Configure the connection and the entity at `forRoot`, then register `forFeature` once in the root module.

### 1. Register the entity with TypeORM

```typescript
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { Upload } from "./upload.entity"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      // ...your database config
      entities: [Upload /* , YourOtherEntities */],
    }),
    TypeOrmModule.forFeature([Upload]),
  ],
})
export class AppModule {}
```

### 2. Configure `StorageModule`

```typescript
import { StorageModule } from "@neomaventures/storage"

@Module({
  imports: [
    StorageModule.forRoot({
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      entity: Upload,
      defaults: {
        maxFileSize: 10_000_000, // 10MB default for every feature
      },
    }),
    StorageModule.forFeature({ bucket: "uploads" }),
  ],
})
export class AppModule {}
```

The `defaults` block on `forRoot` provides fallback values for every `forFeature` import. Each feature overrides what it needs and inherits the rest.

### 3. Use in your controller

```typescript
import {
  Upload as UploadDecorator,
  StoredFile,
  TemporaryLink,
} from "@neomaventures/storage"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"

@Controller("uploads")
export class UploadController {
  public constructor(
    @InjectRepository(Upload) private readonly uploads: Repository<Upload>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator()
  public create(@StoredFile() file: Upload): Upload {
    return file
  }

  @Get(":id")
  @TemporaryLink()
  public async download(@Param("id") id: string): Promise<Upload> {
    return this.uploads.findOneByOrFail({ id })
  }
}
```

The `@Upload()` / `@TemporaryLink()` decorators take no bucket argument. NestJS resolves the `UploadInterceptor` from the module the controller belongs to, so the controller picks up whichever `forFeature` was imported in that module's scope.

## Multi-bucket — `forFeature` per feature module

For apps with distinct buckets per concern (avatars vs message attachments vs CSV exports), register one `forFeature` per feature module. Each gets its own `StorageService` instance bound to its own bucket and inheriting its own feature-scoped defaults.

```typescript
// app.module.ts
@Module({
  imports: [
    StorageModule.forRoot({
      endpoint: config.s3Endpoint,
      region: config.s3Region,
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
      entity: Upload,
      defaults: { maxFileSize: 5_000_000 },
    }),
    AvatarsModule,
    AttachmentsModule,
  ],
})
export class AppModule {}
```

```typescript
// avatars/avatars.module.ts
@Module({
  imports: [
    StorageModule.forFeature({
      bucket: "avatars",
      maxFileSize: 2_000_000, // tighter than the default
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      linkCacheControl: "private, max-age=300",
    }),
  ],
  controllers: [AvatarsController],
})
export class AvatarsModule {}
```

```typescript
// attachments/attachments.module.ts
@Module({
  imports: [
    StorageModule.forFeature({
      bucket: "attachments",
      // inherits maxFileSize: 5_000_000 from root defaults
    }),
  ],
  controllers: [AttachmentsController],
})
export class AttachmentsModule {}
```

Controllers in `AvatarsModule` resolve `StorageService` bound to the `avatars` bucket; controllers in `AttachmentsModule` get the `attachments` instance. There is no token to inject, no bucket name to pass — the module DI scope does the wiring.

## Async configuration

Both `forRoot` and `forFeature` ship async variants for config-driven values.

```typescript
StorageModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    endpoint: config.get("S3_ENDPOINT"),
    region: config.get("S3_REGION"),
    accessKeyId: config.get("S3_ACCESS_KEY_ID"),
    secretAccessKey: config.get("S3_SECRET_ACCESS_KEY"),
    entity: Upload,
  }),
  inject: [ConfigService],
}),

StorageModule.forFeatureAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    bucket: config.get("S3_AVATARS_BUCKET"),
  }),
  inject: [ConfigService],
}),
```

## Type narrowing — how your `Upload` class flows

`StorageModule.forRoot({ entity: Upload })` accepts any class that satisfies `Storable`, but the concrete `Upload` type does not flow through `forRoot` automatically. Narrowing happens at the consumption edges:

| Surface | How `Upload` lands |
| --- | --- |
| `forRoot({ entity: Upload })` | Options accept any `Storable`; no narrowing past this point |
| `forFeature({ bucket })` | Bucket is `string`; no type-level magic |
| `StorageService<Upload>` (injection) | Class-level generic — annotate at constructor injection and methods narrow |
| `@StoredFile() file: Upload` | Annotation-trusted |
| `@TemporaryLink()` handler return | Handler return-type annotation; trusted |

```typescript
import { StorageService } from "@neomaventures/storage"

@Injectable()
export class AvatarsService {
  public constructor(
    private readonly storage: StorageService<Upload>,
  ) {}
}
```

Consumers on the default path inject `StorageService` without type parameters and methods narrow to `Storable`.

## How it works

**Upload (`@Upload()`):**

1. **Middleware:** Multer parses the multipart request (memory storage, single file).
2. **Pre-handler:** The feature-scoped `UploadInterceptor` validates the file (size, type), uploads to the feature's S3 bucket, creates the entity, persists it to the database (so it has an `id`), attaches it to the request, and emits `FileCreatedEvent`.
3. **Your handler:** Receives the persisted entity via `@StoredFile()` — already has an `id`, so you can wire FKs synchronously. If you mutate fields, call `repository.save(file)` yourself; the interceptor does not re-save after your handler runs.
4. **Post-handler:** None. The HTTP response from your handler passes through untouched.

**Download (`@TemporaryLink()`):**

1. **Your handler:** Returns a `Storable` entity (e.g. from a database lookup).
2. **Post-handler:** The feature-scoped `TemporaryLinkInterceptor` generates a presigned S3 URL against the feature's bucket and responds with an HTTP 302 redirect.

## Events

After the S3 object is stored and the entity is persisted — but before the consumer handler runs — a `FileCreatedEvent` is emitted:

```typescript
import { FileCreatedEvent } from "@neomaventures/storage"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class UploadProcessor {
  @OnEvent(FileCreatedEvent.EVENT_NAME)
  public handleFileCreated(event: FileCreatedEvent<Upload>): void {
    console.log("File created:", event.entity.key, "in bucket", event.entity.bucket)
  }
}
```

Events are fire-and-forget — listener errors do not affect the upload response.

**Listeners must not assume FK wiring has happened.** The event fires before any controller logic that might wire foreign keys (e.g. `Account.avatar = file`). If your listener needs that context, emit a domain event from your controller after wiring.

## Exceptions

All exceptions extend `HttpException` and include metadata for diagnostics:

| Exception | Status | Properties |
|-----------|--------|------------|
| `NoFileProvidedException` | 400 | `message` |
| `FileTooLargeException` | 413 | `fileSize: number \| null`, `maxSize: number` |
| `UnsupportedFileTypeException` | 415 | `mimeType: string`, `allowedTypes: string[]` |
| `InvalidStorageKeyException` | 500 | `key: string`, `reason: "empty" \| "too-long"` |
| `FileStoreUnreachableException` | 503 | `endpoint: string`, `bucket: string`, `cause: string` |

`FileTooLargeException.fileSize` is `null` when multer rejects the file before buffering (actual size unknown).

## API Reference

### `StorageRootOptions`

Configured via `StorageModule.forRoot(...)` once per application.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `endpoint` | `string` | Yes | | S3-compatible endpoint URL |
| `region` | `string` | Yes | | AWS region |
| `accessKeyId` | `string` | Yes | | AWS access key ID |
| `secretAccessKey` | `string` | Yes | | AWS secret access key |
| `entity` | `new () => T` | Yes | | TypeORM entity class implementing `Storable` |
| `forcePathStyle` | `boolean` | No | `true` | Use path-style S3 URLs (required for MinIO) |
| `defaults` | `object` | No | `{}` | Defaults for `forFeature` options below |
| `defaults.maxFileSize` | `number` | No | | Default maximum file size in bytes |
| `defaults.allowedMimeTypes` | `string[]` | No | | Default allowed MIME types |
| `defaults.linkExpiresIn` | `number` | No | `3600` | Default presigned URL expiry in seconds |
| `defaults.linkCacheControl` | `string` | No | | Default `Cache-Control` header for 302 responses |

### `StorageFeatureOptions`

Configured via `StorageModule.forFeature(...)` per importing module.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `bucket` | `string` | Yes | | S3 bucket name for this feature |
| `maxFileSize` | `number` | No | root `defaults.maxFileSize` | Maximum file size in bytes |
| `allowedMimeTypes` | `string[]` | No | root `defaults.allowedMimeTypes` | Allowed MIME types |
| `linkExpiresIn` | `number` | No | root `defaults.linkExpiresIn` ?? `3600` | Presigned URL expiry in seconds |
| `linkCacheControl` | `string` | No | root `defaults.linkCacheControl` | `Cache-Control` header for 302 responses |

### `Storable` interface

The contract your entity must implement:

```typescript
interface Storable {
  id: any
  originalName: string
  mimeType: string
  size: number
  key: string
  bucket: string
}
```

### `@Upload(options?)`

Method decorator for upload routes. Feature-scoped defaults are the ceiling; per-route narrows within them.

```typescript
@Upload()                                      // no per-route limits
@Upload({ maxSize: 1_000_000 })                // per-route size limit (1MB)
@Upload({ types: ["text/csv"] })               // per-route type restriction
@Upload({ maxSize: 5_000_000, types: ["application/pdf"] })  // combined
```

#### Custom key resolution

Pass a `key` option to override how S3 object keys are generated. The resolver receives `file.defaultKey` — the key the framework would have produced — so you can decorate it with context or ignore it entirely.

**Function form** — for stateless naming policies with no DI needs:

```typescript
@Upload({
  key: (req, idGenerator, file) =>
    `users/${req.params.userId}/${file.defaultKey}`,
})
```

**Class form** — when the resolver needs injected dependencies:

```typescript
@Injectable()
export class TenantKeyResolver implements StorageKeyResolver {
  public constructor(private readonly config: ConfigService) {}

  public resolve(req: Request, idGenerator: StorageIdGenerator, file: OriginalFileInfo & { defaultKey: string }): string {
    return `${this.config.get("TENANT_PREFIX")}/${file.defaultKey}`
  }
}

@Module({ providers: [TenantKeyResolver] })

@Upload({ key: TenantKeyResolver })
```

### `@StoredFile()`

Parameter decorator that extracts the stored file entity from the request.

### `@TemporaryLink(options?)`

Method decorator for download routes. Handler must return a `Storable` entity, or `null` / `undefined` when paired with `default`.

```typescript
@TemporaryLink()                              // default expiry from feature options
@TemporaryLink({ expiresIn: 600 })            // 10 minute expiry
@TemporaryLink({ default: "/img/avatar.svg" }) // redirect here when handler returns null
@TemporaryLink({ cacheControl: "private, max-age=300" }) // cache the 302 for 5 minutes
```

See [Default for missing assets](#default-for-missing-assets) and [Caching the redirect](#caching-the-redirect) below.

#### Default for missing assets

Pass a `default` URL to redirect to when the handler returns `null` or `undefined`. Useful for default avatars, cover images, and deleted-file placeholders.

```typescript
@Get("avatar")
@TemporaryLink({ default: "/img/default-avatar.svg" })
public async avatar(@CurrentAccount() account: Account): Promise<Upload | null> {
  return this.profile.getAvatar(account.id) // returns null when no avatar is set
}
```

The `default` value is used verbatim as the 302 `Location`. The package does not validate it.

Without `default`, a `null` return is a programmer error and throws. Exceptions thrown inside the handler bubble to the global exception filter — `default` is **not** an error-swallowing fallback.

#### Caching the redirect

Pass `cacheControl` to set a `Cache-Control` header on the 302. The value is passed verbatim to `res.setHeader("Cache-Control", ...)`.

Set a feature-wide default via `StorageModule.forFeature({ linkCacheControl })`; the per-route `cacheControl` overrides it. When neither is set, no header is sent.

**Use `private` for user-scoped assets.** Avatars, attachments, and anything keyed to the current user should be `private, max-age=N` so shared caches don't serve one user's redirect to another.

**Keep `max-age` shorter than `expiresIn`.** The 302 points at a presigned S3 URL that expires after `expiresIn` seconds. If the browser caches the redirect for longer, it will replay an expired URL.

### `FileCreatedEvent`

Emitted after successful upload + persistence. `EVENT_NAME = "storage.file.created"`.

### `StorageService<T extends Storable = Storable>`

Injected via DI; bound to the importing module's feature configuration.

- `store(key, buffer, contentType): Promise<void>` — Upload a file to S3 under the given key, in this feature's bucket.
- `getSignedUrl(key, expiresIn?): Promise<string>` — Generate a presigned download URL against this feature's bucket.
- `bucket: string` — The configured S3 bucket for this feature; use when constructing `Storable` entities outside the `@Upload()` interceptor.

Each `forFeature` import gets its own instance. A service that needs to write to two buckets injects two `StorageService` instances by importing both feature modules and exposing both via different sub-modules — typical NestJS module composition.

## Storage Key Format

By default, keys are generated as `${ulid}-${originalName}`. ULIDs provide time-ordered uniqueness. Filenames are sanitised to strip directory components.

To customise key generation, pass a `key` option to `@Upload()`. See [Custom key resolution](#custom-key-resolution) above.

## Customizing the ID generator

The package ships `UlidIdGenerator` as the default — ULIDs are time-sortable, compact, and globally unique, which makes them a strong default for S3 object keys.

If you want a different identifier (UUID v4, a custom sequential ID, deterministic test IDs, etc.), implement a class with the same shape and override the default via Nest's standard provider replacement.

```typescript
// my-app/src/uuid-id-generator.ts
import { Injectable } from "@nestjs/common"
import { v4 as uuid } from "uuid"

@Injectable()
export class UuidIdGenerator {
  public generate(): string {
    return uuid()
  }
}
```

```typescript
// my-app/src/app.module.ts
import { StorageModule } from "@neomaventures/storage"
import { UlidIdGenerator } from "@neomaventures/storage/services/ulid-id-generator.service"

import { UuidIdGenerator } from "./uuid-id-generator"

@Module({
  imports: [
    StorageModule.forRoot({ /* ... */ }),
    StorageModule.forFeature({ bucket: "uploads" }),
  ],
  providers: [
    { provide: UlidIdGenerator, useClass: UuidIdGenerator },
  ],
})
export class AppModule {}
```

Any class with a `generate(): string` method satisfies the contract.

## Migrating from 0.x — `forFeature` and the bucket move

**Breaking change in this minor.** `bucket` and the per-feature defaults (`maxFileSize`, `allowedMimeTypes`, `linkExpiresIn`, `linkCacheControl`) moved off `StorageRootOptions`. Single-bucket apps add one `StorageModule.forFeature({ bucket })` line in the same module that calls `forRoot`. Multi-bucket apps register `forFeature` per feature module.

### Before

```typescript
StorageModule.forRoot({
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  bucket: "uploads",
  accessKeyId: "...",
  secretAccessKey: "...",
  entity: Upload,
  maxFileSize: 10_000_000,
  linkCacheControl: "private, max-age=300",
})
```

### After

```typescript
StorageModule.forRoot({
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  accessKeyId: "...",
  secretAccessKey: "...",
  entity: Upload,
  defaults: {
    maxFileSize: 10_000_000,
    linkCacheControl: "private, max-age=300",
  },
}),
StorageModule.forFeature({ bucket: "uploads" }),
```

No deprecation shim — pre-1.0 minor bump, clean break. If you keep all options at the root via `defaults`, the only edit per feature is adding the `forFeature({ bucket })` line.

## License

MIT
