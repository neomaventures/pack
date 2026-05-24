# @neoma/docker

## 0.1.0

### Minor Changes

- 1fff501: Add `@neoma/docker` — shared Docker test-container helpers (`waitForHttp`, `waitForTcp`, `stopContainer`, and the `BaseOptions` / `HealthCheckOptions` types) factored out of the per-package bundled copies. The service fixtures (`@neoma/mockserver`, `@neoma/mailpit`) and `@neoma/fixtures` (MinIO) now depend on it. Requires Docker on the host.
