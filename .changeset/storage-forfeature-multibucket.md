---
"@neomaventures/storage": minor
---

Add multi-bucket support via `StorageModule.forFeature` /
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
