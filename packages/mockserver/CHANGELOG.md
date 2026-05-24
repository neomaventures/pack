# @neoma/mockserver

## 0.1.1

### Patch Changes

- 1fff501: Source the Docker container helpers (`waitForHttp` / `waitForTcp` / `stopContainer` + option types) from the new `@neoma/docker` package instead of a bundled copy. No public API change — `@neoma/fixtures/docker` still re-exports the same helpers.
- Updated dependencies [1fff501]
  - @neoma/docker@0.1.0

## 0.1.0

### Minor Changes

- d5e76e8: Add `@neoma/mockserver` — a MockServer test fixture extracted from `@neoma/fixtures`. Ships the `MockServerClient`, Docker container lifecycle (`startContainer` / `stopContainer`), and Jest `globalSetup` / `globalTeardown` drop-ins (`@neoma/mockserver/setup`, `@neoma/mockserver/teardown`). Requires Docker on the host.
