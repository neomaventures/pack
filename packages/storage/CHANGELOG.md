# Changelog

## 0.5.0

### Minor Changes

- **BREAKING:** `UploadInterceptor` now persists the `Storable` entity **before** the consumer handler runs. The handler receives a fully persisted entity (has `id`), so consumers can wire foreign keys synchronously without a double-save workaround. `FileCreatedEvent` now fires before the handler — listeners must not assume any FK wiring has happened. If your handler mutates fields on the entity, you must call `repository.save(file)` yourself; the post-handler auto-save has been removed. Trade-off: a handler that throws leaves the row (and S3 object) in place — orphan rows are accepted as honest signals that the file exists in S3. See "Migrating from 0.x: pre-handler persistence" in the README for before/after snippets. Pre-1.0 breaking change: minor bump per Neoma's pre-launch semver policy.

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
