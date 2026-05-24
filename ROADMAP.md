# `pack` — consolidation roadmap

Working plan for the `@neoma/*` monorepo consolidation. Jump to **Next steps**; the
**Conventions & gotchas** section is reference material for any package bring-in.

## Where things stand

Eight packages, all green (build + lint + unit/e2e), with CI + a Changesets release
pipeline + supply-chain policy in place.

| Package | Role |
|---|---|
| `@neoma/fixtures` | Express/NestJS mocks + Jest matchers + mock logger (featherweight — no Docker) |
| `@neoma/docker` | Docker container helpers — HTTP/TCP health polling + teardown; shared base for the service fixtures |
| `@neoma/minio` | MinIO S3-compatible storage container + bucket + Jest drop-ins |
| `@neoma/mockserver` | MockServer container + client + Jest drop-ins |
| `@neoma/mailpit` | Mailpit email container + client + Jest drop-ins |
| `@neoma/cerberus` | S3-compatible file storage |
| `@neoma/managed-app` | boots a NestJS app from a module path for e2e |
| `@neoma/managed-database` | in-memory SQLite `datasource` fixture |

---

## Next steps

### ~~1. Split base infra out of `@neoma/fixtures`~~ ✅ done
`@neoma/minio`, `@neoma/mockserver`, and `@neoma/mailpit` are now standalone packages
(container lifecycle + client where applicable + the `setup`/`teardown` Jest drop-ins),
on top of the shared `@neoma/docker` base. `@neoma/fixtures` is featherweight:
Express/NestJS mocks + matchers only, no Docker.

- **Boundary rule (kept for future bring-ins):** package boundaries follow
  *peer-dependency* boundaries. Anything that drags a heavy/specific peer
  (typeorm/sqlite, `aws-sdk` for an S3 client, nestjs-core) gets its own package so
  featherweight consumers don't inherit it.
- **Still to come — domain mocks:** on top of the base infra, **domain mocks** (e.g.
  `@neoma/mockserver-gmail` — pre-canned Gmail expectations; **does not exist yet**)
  that depend on a base package. Base packages expose a reusable API (client +
  start/stop), not just a Jest drop-in, precisely so these can be layered on.

### ~~2. Move `garmr` in~~ ✅ done
Flattened from `neoma-garmr` v0.10.0 (cloned fresh): lib → `packages/garmr/src`, e2e
harness → `packages/garmr/e2e/app`, e2e specs → `packages/garmr/e2e`, package fixtures →
`packages/garmr/fixtures`. Brought in at 0.10.0 (already on npm) — no changeset.
Builds + lints; **330 unit + 208 e2e green**.

### ~~3. Update garmr to consume the in-repo packages~~ ✅ done
Rewired off the deleted `@neoma/fixtures/docker` + `/mailpit` + `/mockserver` surfaces:
- email/SMTP → `@neoma/mailpit` (`startContainer` + `MailpitClient`),
- Google OAuth mock → `@neoma/mockserver` (`startContainer` + `MockServerClient`),
- app boot → `@neoma/managed-app`, matchers → `@neoma/fixtures/matchers`.
`@neoma/managed-database` isn't used (harness uses an inline in-memory sqlite datasource).
e2e follows the dist-fidelity convention (harness imports `@neoma/garmr` → built `dist`).

### 4. Promote sensible fixtures from garmr → fixtures
Garmr's fixtures currently stay local. Apply the boundary rule:
- **→ `@neoma/fixtures`** — pure, generic mocks/matchers not already there.
- **→ its own package** — anything needing a heavy peer.
- **stays local in garmr** — domain-specific: `credentials` (password/email policy),
  `magic-link` auth-flow helper, the `google`/`oauth-api` fakes, the htpasswd asset.

### 5. Standardise e2e imports — remove `@lib`
Make import resolution consistent across packages: **e2e (harness + specs) imports the
package by name (`@neoma/<pkg>`)** → jest maps to `dist`, tsconfig maps to `src`;
**unit specs import relative** to the file under test; lib source stays relative. Drop
`@lib` from `tsconfig.base.json` + `jest.config.base.js` and the scaffold placeholder,
and migrate the stragglers (`cerberus` e2e+fixtures, `managed-app` e2e, one `managed-database`
unit spec). garmr already follows this. (Do as its own PR after the garmr bring-in lands.)

---

## Conventions & gotchas (reference for any bring-in)

- **Naming:** product/library packages take mythic names (`@neoma/cerberus`,
  `@neoma/garmr`); test-infra and fixture packages take plain descriptive names
  (`@neoma/fixtures`, `@neoma/managed-app`, `@neoma/managed-database`, `@neoma/minio`).
  A consumer should read the name and know which tier it's in.
- **Toolchain:** use `corepack pnpm` (pinned `11.1.3`). A different local pnpm can
  produce a lockfile CI rejects under the supply-chain policy.
- **Flatten layout:** lib at `packages/<name>/src` (build via `tsconfig.lib.json`,
  excluding specs/fixtures); e2e under `packages/<name>/e2e`; per-package
  `jest.config.js`. Shared `tsconfig.base.json` + `eslint.config.mjs` at root.
- **Release:** Changesets — `pnpm changeset` per change → merge → the auto "Version
  Packages" PR → merge it to publish. Changesets owns each package's `CHANGELOG.md`
  (Keep-a-Changelog preamble removed). Bring-ins at current versions need no changeset.
- **Supply chain (`pnpm-workspace.yaml`):** `minimumReleaseAge: 10080` (reject deps
  published < 7 days ago) + `allowBuilds` allowlist (build-script deps must be listed).
- **CI:** `ci.yml` runs on every branch push (`pnpm -r build / lint / test` +
  `pnpm -r test:e2e`). `release.yml` runs the Changesets action on `main`. **Do not**
  add `setup-node` `registry-url` to `release.yml` — it shadows the Changesets
  `NPM_TOKEN` auth and the publish 404s.
- **Strict-base reconciliation checklist** (these surface when flattening a package):
  - `import * as request from "supertest"` → `import request from "supertest"`.
  - `catch (e)` is `unknown` → narrow (`const error = e as ...`); on re-throw attach
    `{ cause: e }` (the raw caught binding, per `preserve-caught-error`).
  - `||` → `??` (`prefer-nullish-coalescing`).
  - relative `../../fixtures/...` imports → the `fixtures/` alias.
  - harness `src/...` imports → add `src/*` to the package tsconfig `paths` + jest
    `moduleNameMapper`.
  - any dynamic `import()` (module loaders) → `NODE_OPTIONS=--experimental-vm-modules`.
  - test assets referenced by hard-coded relative depth → relocate package-local + fix.
  - `eslint . --fix` cleans up import ordering.
- **cwd-relative module loaders** (like managed-app): test with a disposable, gitignored
  `e2e/.tmp` sandbox + `process.chdir` — never mutate the repo `src/`.

---

## Open items
- **`@types/multer` as a `@neoma/fixtures` peerDep** — `multerFile`'s return type is
  `Express.Multer.File`; decide whether multer types become a declared peer.
- **Node 20 GitHub Actions deprecation** — bump `actions/checkout`, `setup-node`,
  `pnpm/action-setup` (GitHub forces Node 24 from June 2026). Cosmetic for now.
- **e2e fidelity** — consume the built `dist` via the public entry (`@neoma/<pkg>`)
  instead of `@lib` source, add a `publint`/pack check, and speed up (swc transpile,
  boot-once-per-suite + DB reset).
