# SaaS Starter Template

A working NestJS SaaS application that serves two purposes: a **starter kit** for new projects and an **integration test bed** that proves `@neomaventures/*` packages compose correctly in a real app.

The template renders server-side HTML via EJS. No SPA framework.

## Creating a new app

From the pack monorepo root:

```bash
pnpm create:saas <project-name> [target-directory]
```

For example:

```bash
pnpm create:saas saasquatch /path/to/saasquatch
cd /path/to/saasquatch
pnpm install
pnpm dev
```

The setup script:
- Copies the template to the target directory
- Sets the package name in `package.json` (from your project name)
- Resolves `workspace:*` dependencies to the latest published `@neomaventures/*` versions

The target directory defaults to `../<project-name>` relative to the pack root if omitted.

### Prerequisites

The generated app installs `@neomaventures/*` packages from GitHub Packages. You need a `GITHUB_TOKEN` with `read:packages` scope in your `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

The template includes an `.npmrc` that scopes `@neomaventures` to the GitHub Packages registry.

### How the app name works

The welcome page displays the package name from `package.json`. `ViewLocalsMiddleware` reads `NPM_PACKAGE_NAME` and `NPM_PACKAGE_VERSION` (auto-set by pnpm from `package.json`) via `@neomaventures/config` and injects them into every EJS template as `npmPackageName` and `npmPackageVersion`.

No separate `APP_NAME` env var is needed — the name comes from `package.json`.

## Running the template in-repo

The template is a workspace member of the pack monorepo. To run it directly:

```bash
cd templates/saas
pnpm dev
```

When running in-repo, `@neomaventures/*` packages resolve via `workspace:*` — changes to packages are tested against the template immediately, without publishing.

## Project structure

```
templates/saas/
├── src/
│   ├── main.ts                              # Bootstrap
│   └── application/
│       ├── application.module.ts            # Root module (wires ConfigModule)
│       ├── application.controller.ts        # Welcome page controller
│       └── view-locals.middleware.ts         # Injects npmPackageName + npmPackageVersion into res.locals
├── views/
│   ├── welcome.ejs                          # Welcome page
│   └── errors/
│       └── generic.ejs                      # Error page (placeholder)
├── public/
│   └── stylesheets/
│       └── main.css                         # Styles
├── specs/                                   # E2E specs (supertest)
│   └── welcome.e2e-spec.ts
├── ui-specs/                                # UI specs (Playwright)
│   └── welcome.ui-spec.ts
├── fixtures/                                # Test fixtures and setup
│   ├── configure-view-engine.ts
│   └── package-version.ts
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── jest.config.json
├── playwright.config.ts
├── .npmrc
├── .env.development
├── .env.spec
├── .env.e2e-spec
└── .env.ui-spec
```

## Tests

Three test layers, matching the spec ownership model used across Neoma projects:

| Layer | What it proves | Command |
|---|---|---|
| Unit | Individual pieces work (e.g. `ViewLocalsMiddleware` sets `res.locals`) | `pnpm test` |
| E2E | HTTP responses are correct (e.g. `GET /` returns 200 with the package name) | `pnpm test:e2e` |
| UI | Pages render correctly in a browser (e.g. heading visible, version shown) | `pnpm test:ui` |

Template specs test **wiring and composition**, not package internals.

## Wired packages

| Package | Status |
|---|---|
| `@neomaventures/config` | Wired |
| `@neomaventures/fixtures` | Wired (test) |
| `@neomaventures/managed-app` | Wired (test) |
| `@neomaventures/request-context` | Planned |
| `@neomaventures/logging` | Planned |
| `@neomaventures/exceptions` | Planned |
| `@neomaventures/auth` | Planned |
| `@neomaventures/storage` | Planned |
| `@neomaventures/webhooks` | Planned |
| `@neomaventures/route-model-binding` | Planned |

## Local vs generated apps

| Concern | In-repo (local dev) | Generated app (copy-out) |
|---|---|---|
| `@neomaventures/*` resolution | `workspace:*` — bleeding edge | `^0.x.y` — latest published, from registry |
| Purpose | Integration test bed, CI | Starter kit for a new project |
| Package changes reflected | Immediately | After publish + `pnpm update` |

## License

MIT
