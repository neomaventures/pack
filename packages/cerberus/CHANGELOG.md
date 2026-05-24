# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-23

### Added

#### Key Resolution
- `CerberusKeyResolver` interface for class-based custom key resolvers (resolved via DI)
- `CerberusKeyResolverFn` type for stateless function-based key resolvers
- `OriginalFileInfo` interface describing the uploaded file metadata passed to resolvers
- `CerberusIdGenerator` interface for custom ID generation strategies
- `@Upload({ key })` option accepting either a `CerberusKeyResolverFn` or a `Type<CerberusKeyResolver>`
- Resolvers receive `file.defaultKey` — the key the framework would have produced
- Default key format `${ulid}-${originalName}` produced internally by `DefaultKeyResolver`
- `InvalidStorageKeyException` (500) — empty or oversized S3 keys (indicates a resolver bug)

### Changed
- `StorageService.store()` now accepts a pre-resolved key: `store(key, buffer, contentType)` instead of `store(originalName, buffer, contentType)`
- Migrated from npm to pnpm

### Removed
- `field` option from `@Upload()` — multer field name was unused
- `prefix` option from `CerberusOptions` — replaced by custom key resolvers

## [0.1.0] - 2026-04-30

### Added

#### Module & Configuration
- `CerberusModule` with `forRoot` and `forRootAsync` via `ConfigurableModuleBuilder` (global module)
- `CerberusOptions` with `forcePathStyle` (default `true`), `maxFileSize`, `allowedMimeTypes`, `linkExpiresIn`
- `MultipartMiddleware` — registers multer with memory storage, enforces global `maxFileSize` before buffering
- Express type augmentation for `req.cerberus.storedFile` namespace

#### Upload
- `UploadInterceptor<T extends Storable>` — sandwich pattern: validate, upload to S3, persist entity
- `@Upload(options?)` method decorator with `maxSize`, `types`, `key` for per-route validation and custom key resolution
- `@StoredFile()` parameter decorator extracting the stored file entity from the request
- `Storable` interface defining the contract for consumer file entities
- `StorageService` wrapping `@aws-sdk/client-s3` with `store()` and `getSignedUrl()` methods
- Global validation is the ceiling; per-route `maxSize`/`types` narrow within it (intersection semantics)

#### Download
- `@TemporaryLink(options?)` method decorator for presigned download URL routes
- `TemporaryLinkInterceptor` — generates presigned S3 URL, responds with HTTP 302 redirect

#### Events
- `FileCreatedEvent` emitted after successful upload + entity persistence
- Fire-and-forget semantics — listener errors do not affect the upload response
- `@nestjs/event-emitter` as peer dependency

#### Exceptions
- `NoFileProvidedException` (400) — no file in multipart body
- `FileTooLargeException` (413) — `fileSize: number | null`, `maxSize: number`
- `UnsupportedFileTypeException` (415) — `mimeType`, `allowedTypes`
- `FileStoreUnreachableException` (503) — `endpoint`, `bucket`, `cause`

[0.2.0]: https://github.com/neomaventures/cerberus/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/neomaventures/cerberus/releases/tag/v0.1.0
