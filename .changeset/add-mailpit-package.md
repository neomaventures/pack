---
"@neoma/mailpit": minor
---

Add `@neoma/mailpit` — a Mailpit test fixture extracted from `@neoma/fixtures`. Ships the `MailpitClient`, Docker container lifecycle (`startContainer` / `stopContainer`, SMTP + HTTP API ports, optional htpasswd auth), and Jest `globalSetup` / `globalTeardown` drop-ins (`@neoma/mailpit/setup`, `@neoma/mailpit/teardown`). Requires Docker on the host.
