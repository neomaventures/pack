# @neomaventures/mailbox

Provider-agnostic mailbox primitive for NestJS applications. Gmail-first.

Mailbox owns the boundary between your app and a hosted mailbox provider.
It does **not** classify mail — consuming apps (CRMs, document modules,
support tools) apply their own domain logic on top. The package ships an
auth-agnostic token boundary (`TokenAccessor`) and a service that hits
the live provider for stats.

> **Status: v0.1.0 — proof of life.** This release exists to prove the
> wiring end-to-end: a host app implements `TokenAccessor` and reads
> inbox stats live from Gmail. Persistence (entity wiring), raw `.eml`
> sync, sync cursors, `MessageStoredEvent` emission, and the
> `@OnMessage` decorator land in future slices. See `gh issue view 168`
> for the full epic and roadmap.

## Why a token accessor, not an auth dependency?

Mailbox needs an OAuth access token to call Gmail. It does **not** depend
on `@neomaventures/auth`. Instead, the host app implements a tiny
`TokenAccessor` interface and registers it via DI. The host is free to
back the accessor with `@neomaventures/auth`, a custom token store, or a
test double — mailbox doesn't care.

This mirrors the `Storable` boundary in `@neomaventures/storage`:
packages depend on interfaces they define, not on sibling packages.
Token refresh, scope handling, and persistence stay the host's concern.

## Installation

`@neomaventures/*` packages publish privately to GitHub Packages.
Configure `.npmrc` to resolve the `@neomaventures` scope first:

```
@neomaventures:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
npm install @neomaventures/mailbox
```

### Peer dependencies

```bash
npm install @nestjs/common @nestjs/core typeorm
```

## Getting started

### 1. Implement `TokenAccessor`

`TokenAccessor.getToken` takes a single `scope` string. Mailbox does **not**
pass a principal — application concerns ("which user owns this request?")
belong on the application side. The adapter resolves "for whom" itself via
ambient request context. The canonical mechanism in the pack is
[`@neomaventures/request-context`][rc], which exposes an
`AsyncLocalStorage`-backed request slot you can read from anywhere below
the controller boundary. Mailbox doesn't depend on it; you wire it in.

[rc]: ../request-context

`getToken(scope)` has three possible outcomes, and choosing between
"absence returns null" and "absence throws" is a **consumer application-
logic call**. Mailbox propagates whichever the accessor chooses faithfully.

1. **Return a `string`** — a valid token exists. Mailbox calls Gmail.
2. **Return `null`** — no token is available on this request, and that
   is a *normal, expected* state. Mailbox skips the upstream call and
   `MailboxService.getStats()` resolves `null`. The interceptor writes
   `null` to `req.mailboxStats` and `res.locals.mailboxStats`; templates
   branch on presence.
3. **Throw** — something genuinely exceptional happened (missing ambient
   context, a token store outage, a hard-required token being absent when
   the calling flow depends on it). Mailbox propagates the exception and
   the global exception filter renders your `@ErrorTemplate`.

The policy — "is absence normal or exceptional in this app?" — is entirely
the accessor's call. Mailbox has no opinion.

**Example: SaaS with optional Gmail integration.** In a product where
connecting your inbox is optional and most users won't have done it,
absence is the common case. The accessor returns `null`; the profile page
renders an "Unavailable" cell where the counts would be. No exception, no
error UI — this is normal control flow.

**Example: internal tool where Gmail is a hard prerequisite.** In a tool
where every authenticated user is expected to have connected Gmail as part
of onboarding, absence means the app is misconfigured. The accessor throws;
`@neomaventures/exceptions`' global filter renders your error template.

```typescript
import { OAuthTokenService } from "@neomaventures/auth"
import {
  GMAIL_READONLY_SCOPE,
  type TokenAccessor,
} from "@neomaventures/mailbox"
import { getRequest } from "@neomaventures/request-context"
import { Injectable } from "@nestjs/common"

// SaaS-style: absence is normal.
@Injectable()
export class OptionalGmailTokenAccessor implements TokenAccessor {
  public constructor(private readonly oauthTokens: OAuthTokenService) {}

  public async getToken(scope: string): Promise<string | null> {
    if (scope !== GMAIL_READONLY_SCOPE) {
      throw new Error(`Unsupported scope: ${scope}`)
    }
    const account = getRequest()?.account
    if (!account) {
      throw new Error("No authenticated account on the current request")
    }
    const token = await this.oauthTokens.findActiveToken(account.id, "google")
    if (!token || !token.scopes.includes(scope)) {
      return null // normal — the user hasn't connected Gmail yet.
    }
    return token.accessToken
  }
}
```

Pattern-match by importing the exported `GMAIL_READONLY_SCOPE` constant
rather than hard-coding the URL.

### 2. Configure `MailboxModule`

```typescript
import { MailboxModule } from "@neomaventures/mailbox"
import { Module } from "@nestjs/common"

import { AuthTokenAccessor } from "./auth-token.accessor"

@Module({
  imports: [
    MailboxModule.forRoot({
      tokenAccessor: AuthTokenAccessor,
    }),
  ],
  providers: [AuthTokenAccessor],
})
export class AppModule {}
```

Use `forRootAsync` when you need to inject a config service.

### 3. Read stats in a controller

Two paths — pick the one that fits.

#### Path A — `@WithMailboxStats()` + `@MailboxStats()` (recommended)

Apply `@WithMailboxStats()` to the routes that need stats, then inject
the resolved value into a handler parameter with `@MailboxStats()`.
`@WithMailboxStats()` attaches an interceptor that fetches stats and
throws `MailboxApiException` / `MailboxNetworkException` on genuine
upstream failure. Pair with [`@neomaventures/exceptions`][exc]' global
`errorTemplates` to render a friendly error UI on those exceptions.

[exc]: ../exceptions

`@MailboxStats()` reads `req.mailboxStats`. Its type is
`MailboxFolderStats | null` — handlers must branch on presence, because
the consumer's `TokenAccessor` may have signalled "no token available on
this request" by returning `null` (a normal, non-exceptional state; see
above). If `@WithMailboxStats()` wasn't applied to the route,
`req.mailboxStats` is `undefined` and the decorator throws a plain
`Error` naming the likely fix. This is a programmer-error signal, not a
runtime exception your app should catch.

The interceptor also mirrors the resolved value (a stats object OR
`null`) to `res.locals.mailboxStats`, so view templates can read
`<%= mailboxStats && mailboxStats.messageCount %>` directly without a
controller-level view-model shim.

```typescript
import { ExceptionHandlerModule } from "@neomaventures/exceptions"
import {
  type MailboxFolderStats,
  MailboxStats,
  WithMailboxStats,
} from "@neomaventures/mailbox"
import { Controller, Get, Module } from "@nestjs/common"

@Controller("profile")
export class ProfileController {
  @Get("inbox")
  @WithMailboxStats()
  public inbox(
    @MailboxStats() stats: MailboxFolderStats | null,
  ): { stats: MailboxFolderStats | null } {
    return { stats } // stats === null when the accessor returned null
  }
}

@Module({
  imports: [
    ExceptionHandlerModule.forRoot({
      errorTemplates: {
        MailboxApiException: "errors/mailbox",
        MailboxNetworkException: "errors/mailbox",
        default: "errors/generic",
      },
    }),
  ],
  controllers: [ProfileController],
})
export class ProfileModule {}
```

#### Path B — call `MailboxService.getStats()` directly

```typescript
import { MailboxService } from "@neomaventures/mailbox"
import { Controller, Get } from "@nestjs/common"

@Controller("mailbox")
export class MailboxController {
  public constructor(private readonly mailbox: MailboxService) {}

  // Whatever auth strategy your app uses
  @Get("stats")
  public async stats(): Promise<{
    folder: string
    messageCount: number
    unreadCount: number
  } | null> {
    return this.mailbox.getStats()
  }
}
```

Either way, `getStats` calls the Gmail Labels API
(`GET /gmail/v1/users/me/labels/INBOX`) on every request — no caching in
v0.1.0. The `TokenAccessor` is invoked with `GMAIL_READONLY_SCOPE` before
the call so the freshest available token is used.

## Absence vs failure

Mailbox distinguishes **absence** (no token available on this request;
a normal control-flow state) from **failure** (something exceptional
happened; needs a rendered error UI).

### Absence — `null` propagates end-to-end

When the consumer's `TokenAccessor.getToken` resolves `null`:

- `MailboxService.getStats()` resolves `null` without touching Gmail.
- `MailboxStatsInterceptor` writes `null` to both `req.mailboxStats`
  and `res.locals.mailboxStats`.
- `@MailboxStats()` returns `null` to the handler parameter.

No exception is thrown, no error template renders. Handlers and templates
branch on presence.

### Failure — exceptions render via `@neomaventures/exceptions`

Mailbox surfaces two kinds of *failure* from `MailboxStatsInterceptor`,
and one programmer-error signal from `@MailboxStats()`.

### What the interceptor throws

`MailboxStatsInterceptor` calls Gmail on every request to a route
decorated with `@WithMailboxStats()`. On failure it throws one of:

- **`MailboxApiException`** — Gmail responded with a non-2xx status.
- **`MailboxNetworkException`** — `fetch()` rejected (DNS, TCP, timeout,
  connection dropped); no response was received.

Both **always** return HTTP `502 Bad Gateway` regardless of what Gmail
did. Both wire shapes are deliberately opaque so the wire never
discloses which upstream provider the package uses today, nor the
upstream status:

```jsonc
// MailboxApiException
{ "statusCode": 502, "message": "Bad Gateway", "error": "MailboxApi" }

// MailboxNetworkException
{ "statusCode": 502, "message": "Bad Gateway", "error": "MailboxNetwork" }
```

The `error` field is a stable discriminator a template or log handler
can branch on. Server-side debug fields live on the instance, not the
wire:

- `endpoint` — the templated Gmail path that failed
  (`/gmail/v1/users/me/labels/{labelId}`)
- `context` — per-endpoint identifiers (`{ labelId }`)
- `cause` — the underlying error, chained via `Error`'s native `cause`
  so stacks compose. For `MailboxApiException`, `cause` is an
  `HttpException` whose `cause.getStatus()` reports the upstream Gmail
  status and `cause.getResponse()` carries the raw upstream body. For
  `MailboxNetworkException`, `cause` is the original rejected `fetch()`
  error (with `undici` placing the real socket error at `cause.cause`).

### Where the interceptor is applied

The consumer chooses which routes need stats by applying
`@WithMailboxStats()` to the handler. Only routes that opt in pay the
Gmail round-trip — there is no global registration, so unrelated routes
are unaffected. On success the resolved stats are attached to both
`req.mailboxStats` (for the `@MailboxStats()` param decorator) and
`res.locals.mailboxStats` (for view templates):

```typescript
import {
  type MailboxFolderStats,
  MailboxStats,
  WithMailboxStats,
} from "@neomaventures/mailbox"
import { Controller, Get } from "@nestjs/common"

@Controller("profile")
export class ProfileController {
  @Get("inbox")
  @WithMailboxStats()
  public inbox(
    @MailboxStats() stats: MailboxFolderStats | null,
  ): { stats: MailboxFolderStats | null } {
    return { stats }
  }
}
```

### Rendering interceptor-thrown exceptions

Wire a global fallback via `@neomaventures/exceptions`'
`ExceptionHandlerModule.forRoot({ errorTemplates })` (see
[`@neomaventures/exceptions`][exc]). The filter resolves
most-specific-first: exception class name → HTTP status → `default`.
Both forms work for mailbox:

```typescript
import { ExceptionHandlerModule } from "@neomaventures/exceptions"

ExceptionHandlerModule.forRoot({
  errorTemplates: {
    // Status-keyed (catches both mailbox exceptions and any other 502)
    502: "errors/upstream",
    // Or class-keyed if you want a mailbox-specific page
    MailboxApiException: "errors/mailbox",
    MailboxNetworkException: "errors/mailbox",
    default: "errors/generic",
  },
})
```

The `error` field (`"MailboxApi"` / `"MailboxNetwork"`) is available to
the template if a single page wants to branch per failure type. A log
handler that needs upstream detail reads it from the cause chain —
`err.cause.getStatus()` and `err.cause.getResponse()` for
`MailboxApiException`, `err.cause` (and `err.cause.cause` for the OS
errno under `undici`) for `MailboxNetworkException`. Never expose those
to the client; that's why they live on the instance, not the wire.

### `@MailboxStats()`'s plain `Error` is a wiring bug, not a runtime
condition

If you use `@MailboxStats()` on a handler that doesn't also have
`@WithMailboxStats()` applied, the decorator throws:

```
Error: MailboxStats is not available — did you apply @WithMailboxStats() to this route?
```

This is a programmer-error signal — the fix is to apply
`@WithMailboxStats()` to the handler, not to catch the error. Do **not**
add a `500` or `Error` entry to `errorTemplates` to paper over it. The
exception surfaces on the first request to the misconfigured route and
points straight at the fix.

## Constants

- `GMAIL_READONLY_SCOPE` — the Gmail OAuth scope mailbox requires.
- `MailboxFolder` enum — well-known folder identifiers (`Inbox`, `Sent`,
  `Draft`, `Trash`, `Spam`, `Starred`, `Important`, `Unread`). Values map
  to the underlying provider's identifiers (currently Gmail label IDs).

## What this slice does **not** ship

- Persistent mailbox entity wiring (deferred to v0.2.0 with sync writers)
- Raw `.eml` sync into `@neomaventures/storage`
- Sync cursors (backfill `pageToken`, incremental `historyId`)
- `MessageStoredEvent` emission
- `@OnMessage` / `@MailboxInfo` decorators
- Token refresh, heartbeat, or stale-job recovery
- Provider abstraction beyond Gmail
- A bundled `MailboxController` — the consumer ships the route

See the epic (#168) for the full roadmap.

## License

MIT.
