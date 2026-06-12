---
---

saas-template: profile picture epic slice 0 — foundation. Adds an empty auth-gated `GET /profile` page, wires `@neomaventures/storage` (including the `Upload` entity, `Account.avatar` `@OneToOne` relation, and matching migration), adopts `@neomaventures/minio` into the e2e infra, and introduces an `authenticate(app, email)` e2e auth fixture plus a Playwright `login` fixture so dashboard/profile specs no longer inline the magic-link round-trip. No user-visible behaviour beyond the empty `/profile` page itself — slice 1 lands avatar rendering, slice 2 lands upload.
