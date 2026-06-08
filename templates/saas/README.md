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

### Configuration

The app reads configuration from environment variables via `@neomaventures/config`. Each environment has its own `.env` file (`.env.development`, `.env.spec`, `.env.e2e-spec`, `.env.ui-spec`), loaded automatically by the corresponding `pnpm` script.

| Variable | Purpose | Default |
|---|---|---|
| `JWT_SECRET` | Secret key for signing JWT session cookies | `dev-secret-change-me` |
| `SMTP_HOST` | SMTP server for magic link emails | `localhost` |
| `SMTP_PORT` | SMTP port | `1025` |
| `MAIL_FROM` | From address for magic link emails | `noreply@localhost` |
| `APP_URL` | Base URL for magic link callback URLs | `http://localhost:3000` |

For local development, the defaults work out of the box with [Mailpit](https://mailpit.axllent.org/) running on port 1025. In production, set `JWT_SECRET` to a strong random value and configure a real SMTP provider.

`@neomaventures/config` maps camelCase property names to SCREAMING_SNAKE_CASE env vars automatically — no manual `process.env` reads needed.

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
│   ├── application/
│   │   ├── application.module.ts            # Root module (wires Neoma packages)
│   │   ├── application.controller.ts        # Welcome page + error exercise routes
│   │   └── view-locals.middleware.ts         # Injects npmPackageName + npmPackageVersion into res.locals
│   ├── auth/
│   │   ├── auth.module.ts                   # Auth module (magic link controllers)
│   │   ├── auth.controller.ts               # Register, magic link, callback, logout
│   │   └── account.entity.ts               # Account entity (id, email, permissions)
│   └── dashboard/
│       ├── dashboard.module.ts              # Dashboard module
│       └── dashboard.controller.ts          # Protected dashboard (@Authenticated + @Principal)
├── views/
│   ├── welcome.ejs                          # Welcome page
│   ├── dashboard.ejs                        # Authenticated dashboard
│   ├── auth/
│   │   ├── register.ejs                     # Registration form (magic link + Google)
│   │   └── magic-link/
│   │       ├── sent.ejs                     # Check your email confirmation
│   │       └── expired.ejs                  # Link expired error page
│   └── errors/
│       └── generic.ejs                      # Error page
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

## Logging

`ApplicationLoggerService` from `@neomaventures/logging` is the structured logger for application code. Inject it into services and controllers to emit structured log entries:

```ts
@Controller()
export class ApplicationController {
  public constructor(
    private readonly logger: ApplicationLoggerService,
  ) {}

  @Get()
  @Render("welcome")
  public index(): void {
    this.logger.log("Rendering welcome page")
  }
}
```

`ApplicationLoggerService` automatically enriches each log entry with the current request context (request ID, method, path) via `@neomaventures/request-context`. No manual threading is needed.

Nest's own framework logs (module init, route registration, etc.) continue to use the default `ConsoleLogger`. The template does not call `app.useLogger()` — the two loggers serve different purposes.

## Error handling

`@neomaventures/exceptions` provides an exception filter that handles errors thrown from controller routes. It supports two modes:

### Render mode

Decorate a route with `@ErrorTemplate({ default: 'errors/generic' })`. When an exception is thrown, the filter renders `views/errors/generic.ejs` with the exception data (status code, message) instead of returning JSON.

### Redirect mode

When the `@ErrorTemplate` value starts with `/`, the filter issues a 303 redirect to that path instead of rendering a template. For example, `@ErrorTemplate({ default: '/' })` redirects to the welcome page on error. This is useful for form submissions where the user should be sent back to the form.

Both modes require the request to accept `text/html` (content negotiation). JSON-accepting clients receive the standard NestJS JSON error response.

### Exercise route

`GET /error` exercises both modes via a single `@ErrorTemplate` that maps exception classes to strategies:

```ts
@ErrorTemplate({
  BadRequestException: "/",          // 4xx → redirect to /
  default: "errors/generic",         // everything else → render template
})
```

Try these in a browser (`pnpm dev` then visit):

| URL | What happens |
|---|---|
| `http://localhost:3000/error?type=render` | 500 — renders EJS error page with status code and message |
| `http://localhost:3000/error?type=redirect` | 400 — redirects to `/` (BadRequestException maps to `/` prefix) |
| `http://localhost:3000/error?type=foo` | 400 — unknown type, also redirects (BadRequestException) |
| `http://localhost:3000/error` | 400 — no type, same as unknown |

Browsers send `Accept: text/html` by default, so you see the HTML error handling. `curl` without an Accept header gets JSON instead (content negotiation).

## Authentication

`@neomaventures/auth` provides magic link login with stateless JWT cookie sessions. No `express-session` or server-side session store is needed — the auth package manages everything via signed cookies.

### How it works

1. User visits `/auth/register` and enters their email
2. `POST /auth/register` validates the email and sends a magic link
3. User is redirected to `/auth/magic-link/sent` ("check your email")
4. User clicks the link in their email, which hits `GET /auth/magic-link/callback`
5. The callback verifies the token, creates or finds the account, sets a JWT session cookie, and redirects to `/dashboard`
6. Subsequent requests include the cookie — the user is authenticated

### Protecting routes

Apply `@UseGuards(new Authenticated("/auth/register"))` to any route that requires a logged-in user. Unauthenticated requests are redirected to the given URL:

```ts
@Controller("dashboard")
export class DashboardController {
  @Get()
  @Render("dashboard")
  @UseGuards(new Authenticated("/auth/register"))
  public index(@Principal() principal: Account): { email: string } {
    return { email: principal.email }
  }
}
```

`@Principal()` is a parameter decorator that resolves the authenticated account from the JWT session.

### Auth routes

Auth routes live in `src/auth/`, dashboard in `src/dashboard/`, and the Account entity in `src/auth/`.

| Route | What it does |
|---|---|
| `GET /auth/register` | Renders the registration page with a magic link form and a disabled Google OAuth button |
| `POST /auth/register` | Validates the email, sends a magic link, redirects to `/auth/magic-link/sent` |
| `GET /auth/magic-link/sent` | "Check your email" confirmation page |
| `GET /auth/magic-link/callback` | Verifies the magic link token, creates a JWT session cookie, redirects to `/dashboard` |
| `GET /auth/magic-link/expired` | Error page for invalid or expired magic links |
| `GET /dashboard` | Protected — renders the dashboard with the authenticated account's email. Redirects to `/auth/register` if unauthenticated |
| `POST /auth/logout` | Clears the session cookie, redirects to `/` |

### Google OAuth

The sign up page includes a disabled Google OAuth button marked "coming soon". Google login is planned but deferred until the magic link flow stabilises.

### Testing the auth flow

Try the full flow in a browser (`pnpm dev` then visit):

| URL | What happens |
|---|---|
| `http://localhost:3000/auth/register` | Registration page with magic link form and disabled Google button |
| Submit an email on the form | Sends a magic link email, redirects to "check your email" page |
| Check Mailpit at `http://localhost:8025` | Click the magic link in the captured email |
| `http://localhost:3000/dashboard` | Protected — redirects to `/auth/register` if not authenticated |
| `POST /auth/logout` (Sign out button) | Clears session, redirects to `/` |

E2e specs use Mailpit to capture the magic link email and complete the full authentication lifecycle programmatically.

## Tests

Three test layers, matching the spec ownership model used across Neoma projects:

| Layer | What it proves | Command |
|---|---|---|
| Unit | Individual pieces work (e.g. `ViewLocalsMiddleware` sets `res.locals`, `Account` entity constraints) | `pnpm test` |
| E2E | HTTP responses are correct (e.g. `GET /` returns 200 with the package name, magic link flow creates a session) | `pnpm test:e2e` |
| UI | Pages render correctly in a browser (e.g. heading visible, sign up form present, dashboard shows email) | `pnpm test:ui` |

Template specs test **wiring and composition**, not package internals.

## Wired packages

| Package | Status |
|---|---|
| `@neomaventures/config` | Wired |
| `@neomaventures/request-context` | Wired |
| `@neomaventures/logging` | Wired |
| `@neomaventures/exceptions` | Wired |
| `@neomaventures/auth` | Wired |
| `@neomaventures/fixtures` | Wired (test) |
| `@neomaventures/managed-app` | Wired (test) |
| `@neomaventures/managed-database` | Wired (test) |
| `@neomaventures/mailpit` | Wired (test) |
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
