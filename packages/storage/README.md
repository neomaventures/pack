# @neoma/storage

NestJS-idiomatic file storage for S3-compatible backends.

Cerberus (the three-headed dog guarding the gates of the Underworld) handles the file upload lifecycle: store to S3, persist metadata to your entity, and generate presigned download URLs -- all through interceptors and decorators that compose naturally with NestJS controllers.

## Installation

```bash
npm install @neoma/storage
```

### Peer dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/typeorm @nestjs/event-emitter typeorm reflect-metadata rxjs
```

## Quick Start

### 1. Define your entity

Your entity implements the `Storable` interface:

```typescript
import { type Storable } from "@neoma/storage"
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
import { CerberusModule } from "@neoma/storage"

@Module({
  imports: [
    TypeOrmModule.forRoot({ ... }),
    CerberusModule.forRoot({
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
CerberusModule.forRootAsync({
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
} from "@neoma/storage"

@Controller("uploads")
export class UploadController {
  public constructor(private readonly dataSource: DataSource) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator()
  public create(@StoredFile() file: Upload): Upload {
    file.source = "form"
    return file
  }

  @Post("csv")
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator({ types: ["text/csv"], maxSize: 1_000_000 })
  public importCsv(@StoredFile() file: Upload): Upload {
    file.source = "csv-import"
    return file
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
2. **Pre-handler:** Interceptor validates the file (size, type), uploads to S3, creates the entity, attaches it to the request
3. **Your handler:** Receives the entity via `@StoredFile()`, mutates any additional fields, returns the HTTP response
4. **Post-handler:** Interceptor persists the entity to the database, emits `FileCreatedEvent`

**Download (`@TemporaryLink()`):**

1. **Your handler:** Returns a `Storable` entity (e.g. from database lookup)
2. **Post-handler:** Interceptor generates a presigned S3 URL and responds with HTTP 302 redirect

## Events

After a successful upload and entity persistence, a `FileCreatedEvent` is emitted:

```typescript
import { FileCreatedEvent } from "@neoma/storage"
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

### `CerberusOptions`

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
export class TenantKeyResolver implements CerberusKeyResolver {
  public constructor(private readonly config: ConfigService) {}

  public resolve(req: Request, idGenerator: CerberusIdGenerator, file: OriginalFileInfo & { defaultKey: string }): string {
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

Method decorator for download routes. Handler must return a `Storable` entity.

```typescript
@TemporaryLink()                  // default expiry from CerberusOptions.linkExpiresIn
@TemporaryLink(600)               // 10 minute expiry
```

### `FileCreatedEvent`

Emitted after successful upload + persistence. `EVENT_NAME = "cerberus.file.created"`.

### `StorageService`

Injected via DI. Wraps `@aws-sdk/client-s3`.

- `store(key, buffer, contentType): Promise<void>` -- Upload a file to S3 under the given key
- `getSignedUrl(key, expiresIn?): Promise<string>` -- Generate a presigned download URL

## Storage Key Format

By default, keys are generated as `${ulid}-${originalName}`. ULIDs provide time-ordered uniqueness. Filenames are sanitised to strip directory components.

To customise key generation, pass a `key` option to `@Upload()`. See [Custom key resolution](#custom-key-resolution) above.

## License

MIT
