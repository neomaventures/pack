---
"@neomaventures/storage": minor
---

**BREAKING:** `UploadInterceptor` now persists the `Storable` entity **before** the consumer handler runs. The handler receives a fully persisted entity (has `id`), so consumers can wire foreign keys synchronously without a double-save workaround. `FileCreatedEvent` now fires before the handler — listeners must not assume any FK wiring has happened. If your handler mutates fields on the entity, you must call `repository.save(file)` yourself; the post-handler auto-save has been removed. Trade-off: a handler that throws leaves the row (and S3 object) in place — orphan rows are accepted as honest signals that the file exists in S3. See "Migrating from 0.x: pre-handler persistence" in the README for before/after snippets. Pre-1.0 breaking change: minor bump per Neoma's pre-launch semver policy.
