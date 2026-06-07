# SaaS Starter Template

A working NestJS SaaS application that serves two purposes: a **starter kit** for new projects and an **integration test bed** that proves `@neomaventures/*` packages compose correctly in a real app.

The template renders server-side HTML — not JSON. Controllers render views, htmx handles dynamic interactions, and Alpine.js manages client-side state. No SPA framework.

| Layer | Technology |
|---|---|
| Templating | EJS |
| Dynamic interactions | htmx |
| Client-side state | Alpine.js |

## Why this exists

Every `@neomaventures/*` package has its own specs, but package-level tests cannot catch integration bugs: guard ordering across packages, `forRoot` / `forRootAsync` wiring conflicts, middleware composition, DI resolution in a fully assembled app. These bugs surface in consumer apps (usually at the worst time).

The template catches them in pack's CI, before they reach any consumer. It also means new SaaS projects start with a working app instead of 200 lines of boilerplate.

## Creating a new app

Generate a new project from the template:

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

The setup script copies the template, replaces placeholder tokens with your project name, and resolves `workspace:*` dependencies to the latest published `@neomaventures/*` versions so the generated app installs from the registry. The target directory defaults to `../<project-name>` relative to the pack root if omitted.

`GET http://localhost:3000` renders a welcome page with your app name.

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
│       ├── application.module.ts            # Root module
│       ├── application.controller.ts        # Welcome page controller
│       └── view-locals.middleware.ts         # Injects appName + version into res.locals
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
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── jest.config.json
├── playwright.config.ts
├── .env.unit
├── .env.e2e
└── .env.ui-spec
```

## Tests

The template has three test layers, matching the spec ownership model used across Neoma projects:

| Layer | What it proves | Command |
|---|---|---|
| Unit | Individual pieces work (e.g. `ViewLocalsMiddleware` sets `res.locals`) | `pnpm test` |
| E2E | HTTP responses are correct (e.g. `GET /` returns 200 with the app name) | `pnpm test:e2e` |
| UI | Pages render correctly in a browser (e.g. heading visible, scripts loaded) | `pnpm test:ui` |

Template specs test **wiring and composition**, not package internals. They prove that NestJS renders the correct view, middleware injects the right locals, and packages compose without conflict. Package-level behaviour is tested in the packages themselves.

## Wired packages

The template starts as a minimal scaffold. Packages are wired incrementally as their integration is implemented and tested:

| Package | Status |
|---|---|
| `@neomaventures/config` | Planned |
| `@neomaventures/request-context` | Planned |
| `@neomaventures/logging` | Planned |
| `@neomaventures/exceptions` | Planned |
| `@neomaventures/auth` | Planned |
| `@neomaventures/storage` | Planned |
| `@neomaventures/webhooks` | Planned |
| `@neomaventures/route-model-binding` | Planned |

Each package integration lands with integration specs that prove it composes correctly with everything already wired.

## Local vs generated apps

| Concern | In-repo (local dev) | Generated app (copy-out) |
|---|---|---|
| `@neomaventures/*` resolution | `workspace:*` — bleeding edge, unpublished changes | `^0.x.y` — latest published, from registry |
| Purpose | Integration test bed, CI | Starter kit for a new project |
| Package changes reflected | Immediately | After publish + `pnpm update` |

## License

MIT
