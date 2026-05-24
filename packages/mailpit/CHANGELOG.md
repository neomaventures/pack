# @neoma/mailpit

## 0.1.0

### Minor Changes

- 1fff501: Add `@neoma/mailpit` — a Mailpit test fixture extracted from `@neoma/fixtures`. Ships the `MailpitClient`, Docker container lifecycle (`startContainer` / `stopContainer`, SMTP + HTTP API ports, optional htpasswd auth), and Jest `globalSetup` / `globalTeardown` drop-ins (`@neoma/mailpit/setup`, `@neoma/mailpit/teardown`). Requires Docker on the host.

### Patch Changes

- Updated dependencies [1fff501]
  - @neoma/docker@0.1.0
