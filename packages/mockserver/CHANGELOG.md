# @neoma/mockserver

## 0.1.0

### Minor Changes

- d5e76e8: Add `@neoma/mockserver` — a MockServer test fixture extracted from `@neoma/fixtures`. Ships the `MockServerClient`, Docker container lifecycle (`startContainer` / `stopContainer`), and Jest `globalSetup` / `globalTeardown` drop-ins (`@neoma/mockserver/setup`, `@neoma/mockserver/teardown`). Requires Docker on the host.
