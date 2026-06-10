# Changelog

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
