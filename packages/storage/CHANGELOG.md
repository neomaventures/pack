# Changelog

## 0.6.0

### Minor Changes

- 76771b4: Add multi-bucket support via `StorageModule.forFeature` /
  `forFeatureAsync`; `bucket` is removed from `forRoot`. Clean break, minor
  bump (pre-1.0).

  **Added**
  - `StorageModule.forFeature({ bucket, ...overrides })` and
    `StorageModule.forFeatureAsync(...)` for declaring one feature module
    per logical bucket.
  - `StorageRootOptions.defaults` nested block for app-wide defaults that
    feature modules can override (`maxFileSize`, `allowedMimeTypes`,
    `linkExpiresIn`, `linkCacheControl`).
  - `StorageFeatureOptions` interface.
  - `S3ClientProvider` extracted to a root-scoped singleton; feature-scoped
    services share the same S3 connection pool.
  - Class-level generic on `StorageService<T extends Storable = Storable>`
    (forward-looking; matches the existing `UploadInterceptor<T>` shape).

  **Removed / changed**
  - `bucket` field removed from `StorageRootOptions`.
  - `maxFileSize`, `allowedMimeTypes`, `linkExpiresIn`, `linkCacheControl`
    move from flat root fields into nested `defaults: { ... }`.
  - Type `StorageOptions` renamed to `StorageRootOptions`. A deprecated
    `StorageOptions` alias is kept for one minor and will be removed in a
    subsequent minor.

  **Migration** — single-bucket app:

  ```typescript
  // Before
  StorageModule.forRoot({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    entity: Upload,
    maxFileSize: 5 * 1024 * 1024,
  })

  // After
  StorageModule.forRoot({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    entity: Upload,
    defaults: { maxFileSize: 5 * 1024 * 1024 },
  })
  StorageModule.forFeature({ bucket: process.env.S3_BUCKET })
  ```

  **Multi-bucket** — bucket-per-feature scoping:

  ```typescript
  // app.module.ts
  StorageModule.forRoot({ endpoint, region, keys, entity: Upload })

  // avatars.module.ts
  StorageModule.forFeature({ bucket: "avatars", maxFileSize: 2 * 1024 * 1024 })

  // attachments.module.ts
  StorageModule.forFeature({ bucket: "attachments" })
  ```

  **Type narrowing** is asymmetric across the surface:
  - `forFeature({ bucket })` — `bucket` is `string`; no type-level
    narrowing.
  - `StorageService<Upload>` (injection) — consumer annotates; the
    class-level generic narrows method return types.
  - `@Upload() file: Upload` decorator — annotation-trusted.

  A consumer can now ship `avatars` (public-read) and `attachments`
  (private) in separate buckets with different size limits, ACLs, and
  lifecycles. Single-bucket apps add one line; multi-bucket apps get
  bucket-per-use scoping.

## 0.5.1

### Patch Changes

- a15d6f5: Fix `MultipartMiddleware` dropping the caller's `AsyncLocalStorage` frame for multipart bodies whose parsing spans multiple event-loop ticks (typically > ~100KB).

  Multer captures its callback and invokes it later from a stream `"finish"` event whose async context is Node's HTTP parser, not the ALS frame opened by upstream middleware. Without rebinding, ALS-backed reads in downstream guards, interceptors, or handlers (e.g. `getPrincipal()` from `@neomaventures/auth`) return `undefined` for any request large enough to span ticks.

  The fix wraps multer's callback in `AsyncResource.bind(...)`, restoring the original async context when the callback fires. No API change. See multer #814 and the new `e2e/core/upload/als-propagation.e2e-spec.ts` regression spec.

## 0.5.0

### Minor Changes

- 8c9c814: **BREAKING:** `UploadInterceptor` now persists the `Storable` entity **before** the consumer handler runs. The handler receives a fully persisted entity (has `id`), so consumers can wire foreign keys synchronously without a double-save workaround. `FileCreatedEvent` now fires before the handler — listeners must not assume any FK wiring has happened. If your handler mutates fields on the entity, you must call `repository.save(file)` yourself; the post-handler auto-save has been removed. Trade-off: a handler that throws leaves the row (and S3 object) in place — orphan rows are accepted as honest signals that the file exists in S3. See "Migrating from 0.x: pre-handler persistence" in the README for before/after snippets. Pre-1.0 breaking change: minor bump per Neoma's pre-launch semver policy.

## 0.4.0

### Minor Changes

- a332e4f: Add `cacheControl` option to `@TemporaryLink()` and `linkCacheControl` to `StorageOptions`. The interceptor now sets a `Cache-Control` header on the 302 redirect before responding, letting browsers cache the redirect hop for a short window — useful for assets rendered repeatedly across pages (avatars, attachments). Per-route `cacheControl` overrides the global default; when neither is set no header is sent (existing behaviour preserved). The value is passed verbatim to `res.setHeader` — the package does not parse or validate it. Keep `max-age` shorter than `expiresIn` so the browser does not replay an expired presigned URL.

## 0.3.0

### Minor Changes

- 21b9b70: Add `default` option to `@TemporaryLink()`. When a handler returns `null` or `undefined`, the interceptor now redirects to the configured default URL instead of throwing. Useful for default avatars, cover images, and deleted-file placeholders. Without `default`, the existing strict contract is preserved — `null` still throws. The decorator also accepts an options object (`{ expiresIn, default }`) alongside the existing `@TemporaryLink()` and `@TemporaryLink(600)` shorthands.

## 0.2.1

### Patch Changes

- 286f944: Adopt `ManagedDatabaseModule.forRoot()` from `@neomaventures/managed-database` in test setup. Internal refactor only — no public API change.

## 0.2.0

### Minor Changes

- d4c5428: Add `bucket` getter to `StorageService`.

  `StorageService.bucket` returns the configured S3 bucket name. Use it when constructing `Storable` entities outside the `@Upload()` interceptor — e.g. seeders, background jobs, or importers that persist `Storable` rows programmatically and need `Storable.bucket` to match the bucket this service writes to.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
