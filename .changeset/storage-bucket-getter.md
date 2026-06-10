---
"@neomaventures/storage": minor
---

Add `bucket` getter to `StorageService`.

`StorageService.bucket` returns the configured S3 bucket name. Use it when constructing `Storable` entities outside the `@Upload()` interceptor — e.g. seeders, background jobs, or importers that persist `Storable` rows programmatically and need `Storable.bucket` to match the bucket this service writes to.
