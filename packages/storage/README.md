# @neomaventures/storage

NestJS-idiomatic file storage for S3-compatible backends.

Storage (the three-headed dog guarding the gates of the Underworld) handles the file upload lifecycle: store to S3, persist metadata to your entity, and generate presigned download URLs -- all through interceptors and decorators that compose naturally with NestJS controllers.

## Installation

`@neomaventures/*` packages publish privately to GitHub Packages. Configure `.npmrc` to resolve the `@neoma` scope first:

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
npm install @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/typeorm @nestjs/event-emitter typeorm reflect-metadata rxjs
```

## Quick Start

### 1. Define your entity

Your entity implements the `Storable` interface:

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

  // Add your own columns
  @Column({ nullable: true })
  public source?: string
}
```

### 2. Register the module

```typescript
import { StorageModule } from "@neomaventures/storage"

@Module({
  imports: [
    TypeOrmModule.forRoot({ ... }),
    StorageModule.forRoot({
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      bucket: "uploads",
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      entity: Upload,
      maxFileSize: 10_000_000, // 10MB global limit
    }),
  ],
})
export class AppModule {}
```

Or with async configuration:

```typescript
StorageModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    endpoint: config.get("S3_ENDPOINT"),
    region: config.get("S3_REGION"),
    bucket: config.get("S3_BUCKET"),
    accessKeyId: config.get("S3_ACCESS_KEY_ID"),
    secretAccessKey: config.get("S3_SECRET_ACCESS_KEY"),
    entity: Upload,
  }),
  inject: [ConfigService],
})
```

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
    private readonly dataSource: DataSource,
    @InjectRepository(Upload) private readonly uploads: Repository<Upload>,
  ) {}

  // Simple case: the file arrives already persisted (has an id) — return as-is.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator()
  public create(@StoredFile() file: Upload): Upload {
    return file
  }

  // Mutating fields after the interceptor save? Persist explicitly.
  @Post("csv")
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator({ types: ["text/csv"], maxSize: 1_000_000 })
  public async importCsv(@StoredFile() file: Upload): Promise<Upload> {
    file.source = "csv-import"
    return this.uploads.save(file)
  }

  @Get(":id")
  @TemporaryLink()
  public async download(@Param("id") id: string): Promise<Upload> {
    return this.dataSource.getRepository(Upload).findOneByOrFail({ id })
  }
}
```

### How it works

**Upload (`@Upload()`):**

1. **Middleware:** Multer parses the multipart request (memory storage, single file)
2. **Pre-handler:** Interceptor validates the file (size, type), uploads to S3, creates the entity, **persists it to the database** (so it has an `id`), attaches it to the request, and emits `FileCreatedEvent`
3. **Your handler:** Receives the persisted entity via `@StoredFile()` — already has an `id`, so you can wire FKs synchronously. If you mutate fields on the entity you must call `repository.save(file)` yourself; the interceptor does not re-save after your handler runs.
4. **Post-handler:** None. The HTTP response from your handler passes through untouched.

**Download (`@TemporaryLink()`):**

1. **Your handler:** Returns a `Storable` entity (e.g. from database lookup)
2. **Post-handler:** Interceptor generates a presigned S3 URL and responds with HTTP 302 redirect

## Events

After the S3 object is stored and the entity is persisted — but **before** the consumer handler runs — a `FileCreatedEvent` is emitted:

```typescript
import { FileCreatedEvent } from "@neomaventures/storage"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class UploadProcessor {
  @OnEvent(FileCreatedEvent.EVENT_NAME)
  public handleFileCreated(event: FileCreatedEvent<Upload>): void {
    console.log("File created:", event.entity.key)
  }
}
```

Events are fire-and-forget -- listener errors do not affect the upload response.

**Listeners must not assume FK wiring has happened.** The event is an honest signal that the file exists in S3 and a row exists in the database — it fires before any controller logic that might wire foreign keys (e.g. `Account.avatar = file`). If your listener needs that context, listen for a domain event your controller emits after wiring instead.

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

### `StorageOptions`

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `endpoint` | `string` | Yes | | S3-compatible endpoint URL |
| `region` | `string` | Yes | | AWS region |
| `bucket` | `string` | Yes | | S3 bucket name |
| `accessKeyId` | `string` | Yes | | AWS access key ID |
| `secretAccessKey` | `string` | Yes | | AWS secret access key |
| `entity` | `new () => T` | Yes | | TypeORM entity class implementing `Storable` |
| `maxFileSize` | `number` | No | | Global maximum file size in bytes |
| `allowedMimeTypes` | `string[]` | No | | Global allowed MIME types |
| `linkExpiresIn` | `number` | No | `3600` | Default presigned URL expiry in seconds |
| `linkCacheControl` | `string` | No | | Default `Cache-Control` header for temporary-link 302 responses |
| `forcePathStyle` | `boolean` | No | `true` | Use path-style S3 URLs (required for MinIO) |

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

Method decorator for upload routes. Global limits are the ceiling; per-route narrows within it.

```typescript
@Upload()                                      // no per-route limits
@Upload({ maxSize: 1_000_000 })                // per-route size limit (1MB)
@Upload({ types: ["text/csv"] })               // per-route type restriction
@Upload({ maxSize: 5_000_000, types: ["application/pdf"] })  // combined
```

#### Custom key resolution

Pass a `key` option to override how S3 object keys are generated. The resolver receives `file.defaultKey` -- the key the framework would have produced -- so you can decorate it with context or ignore it entirely.

**Function form** -- for stateless naming policies with no DI needs:

```typescript
@Upload({
  key: (req, idGenerator, file) =>
    `users/${req.params.userId}/${file.defaultKey}`,
})
```

**Class form** -- when the resolver needs injected dependencies:

```typescript
@Injectable()
export class TenantKeyResolver implements StorageKeyResolver {
  public constructor(private readonly config: ConfigService) {}

  public resolve(req: Request, idGenerator: StorageIdGenerator, file: OriginalFileInfo & { defaultKey: string }): string {
    return `${this.config.get("TENANT_PREFIX")}/${file.defaultKey}`
  }
}

// Register the resolver as a provider in your module
@Module({ providers: [TenantKeyResolver] })

// Then reference the class in the decorator
@Upload({ key: TenantKeyResolver })
```

### `@StoredFile()`

Parameter decorator that extracts the stored file entity from the request.

### `@TemporaryLink(options?)`

Method decorator for download routes. Handler must return a `Storable` entity, or `null`/`undefined` when paired with `default`.

```typescript
@TemporaryLink()                              // default expiry from StorageOptions.linkExpiresIn
@TemporaryLink({ expiresIn: 600 })            // 10 minute expiry
@TemporaryLink({ default: "/img/avatar.svg" }) // redirect here when handler returns null
@TemporaryLink({ cacheControl: "private, max-age=300" }) // cache the 302 for 5 minutes
```

#### Default for missing assets

Pass a `default` URL to redirect to when the handler returns `null` or `undefined`. Useful for default avatars, cover images, and deleted-file placeholders.

```typescript
@Get("avatar")
@TemporaryLink({ default: "/img/default-avatar.svg" })
public async avatar(@CurrentUser() user: User): Promise<Upload | null> {
  return this.profile.getAvatar(user.id) // returns null when no avatar is set
}
```

The `default` value is used verbatim as the 302 `Location` — relative path, absolute URL, or another route. The package does not validate it.

Without `default`, a `null` return is a programmer error and throws — the existing strict contract is preserved for callers who haven't opted in.

`default` only covers the "handler returned null" path. Exceptions thrown inside the handler (DB down, S3 unreachable, `findOneByOrFail` miss) bubble to the global exception filter as before — `default` is **not** an error-swallowing fallback.

#### Caching the redirect

Pass `cacheControl` to set a `Cache-Control` header on the 302. Useful when the same temporary link is rendered repeatedly (e.g. an avatar in the nav bar across page navigations) — the browser skips the redirect hop until the cache window expires.

```typescript
@Get("avatar")
@TemporaryLink({ expiresIn: 3600, cacheControl: "private, max-age=300" })
public async avatar(@CurrentUser() user: User): Promise<Upload | null> {
  return this.profile.getAvatar(user.id)
}
```

The value is passed verbatim to `res.setHeader("Cache-Control", ...)`. The package does not parse or validate it.

Set a global default via `StorageOptions.linkCacheControl`; the per-route `cacheControl` overrides it. When neither is set, no header is sent (existing behaviour).

**Use `private` for user-scoped assets.** Avatars, attachments, and anything keyed to the current user should be `private, max-age=N` so shared caches (proxies, CDNs) don't serve one user's redirect to another.

**Keep `max-age` shorter than `expiresIn`.** The 302 points at a presigned S3 URL that expires after `expiresIn` seconds. If the browser caches the redirect for longer, it will replay an expired URL and the download will fail. A `max-age` well under `expiresIn` (e.g. 300s cache on a 3600s link) leaves headroom for clock skew and in-flight requests.

### `FileCreatedEvent`

Emitted after successful upload + persistence. `EVENT_NAME = "storage.file.created"`.

### `StorageService`

Injected via DI. Wraps `@aws-sdk/client-s3`.

- `store(key, buffer, contentType): Promise<void>` -- Upload a file to S3 under the given key
- `getSignedUrl(key, expiresIn?): Promise<string>` -- Generate a presigned download URL
- `bucket: string` -- The configured S3 bucket name; use when constructing `Storable` entities outside the `@Upload()` interceptor

## Storage Key Format

By default, keys are generated as `${ulid}-${originalName}`. ULIDs provide time-ordered uniqueness. Filenames are sanitised to strip directory components.

To customise key generation, pass a `key` option to `@Upload()`. See [Custom key resolution](#custom-key-resolution) above.

## Customizing the ID generator

The package ships `UlidIdGenerator` as the default — ULIDs are time-sortable, compact (26 chars vs 36 for UUID), and globally unique, which makes them a strong default for S3 object keys.

If you want a different identifier (UUID v4, a custom sequential ID, deterministic test IDs, etc.), implement a class with the same shape and override the default via Nest's standard provider replacement.

```ts
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

```ts
// my-app/src/app.module.ts
import { Module } from "@nestjs/common"
import { StorageModule } from "@neomaventures/storage"
// `UlidIdGenerator` is the default-implementation class, kept out of the
// public barrel deliberately — reach for it via this deep path only when
// you're replacing it.
import { UlidIdGenerator } from "@neomaventures/storage/services/ulid-id-generator.service"

import { UuidIdGenerator } from "./uuid-id-generator"

@Module({
  imports: [StorageModule.forRoot({ /* ... */ })],
  providers: [
    { provide: UlidIdGenerator, useClass: UuidIdGenerator },
  ],
})
export class AppModule {}
```

Any class with a `generate(): string` method satisfies the contract — the upload pipeline calls `idGenerator.generate()` to mint each key prefix. Inject it the same way for tests (e.g. a `TestIdGenerator` that returns predictable strings) so your specs don't have to mock around ULID's randomness.

## Migrating from 0.x: pre-handler persistence

**Breaking change in 0.5.0.** The `UploadInterceptor` lifecycle changed: the entity is now saved to the database **before** the consumer handler runs, not after. This unblocks consumers who want to wire foreign keys (e.g. `Account.avatar = file`) without a double-save workaround.

### What changed

- **Before (0.4.x and earlier):** Interceptor called `repository.create()` pre-handler. Your handler received an unpersisted entity (no `id`). The interceptor called `repository.save()` post-handler, then emitted `FileCreatedEvent`.
- **After (0.5.0+):** Interceptor calls `repository.save()` pre-handler. Your handler receives a persisted entity (has `id`). `FileCreatedEvent` fires before the handler. No post-handler save.

### Before / after consumer snippets

**Before** — handler mutates and returns; interceptor auto-saves:

```typescript
@Post()
@UploadDecorator()
public create(@StoredFile() file: Upload): Upload {
  file.source = "form"
  return file // interceptor saves this post-handler
}
```

**After** — file is already saved; mutate-and-save is explicit:

```typescript
@Post()
@UploadDecorator()
public async create(@StoredFile() file: Upload): Promise<Upload> {
  file.source = "form"
  return this.uploads.save(file) // explicit
}
```

If your handler did not mutate fields, just return the file as-is — no migration needed.

### Wiring FKs is now a one-liner

The original motivation. Before, you had to inject the uploads repository and double-save to set a foreign key. Now:

```typescript
@Post("avatar")
@UploadDecorator()
public async uploadAvatar(
  @CurrentUser() user: User,
  @StoredFile() file: Upload,
): Promise<void> {
  await this.accounts.update(user.id, { avatar: file }) // file.id exists
}
```

### Trade-off: orphan rows on handler failure

Because persistence happens before the handler runs, a handler that throws leaves the row (and S3 object) in place. This is intentional: the file genuinely exists in S3, so an orphan row is an *honest* row. If you need transactional cleanup, listen for `FileCreatedEvent` and reconcile out-of-band, or wrap the handler in a try/catch that deletes the row explicitly.

## License

MIT
