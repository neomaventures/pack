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

`TokenAccessor.getToken` takes a single `scope` string and returns an access
token. Mailbox does **not** pass a principal — application concerns ("which
user owns this request?") belong on the application side. The adapter
resolves "for whom" itself via ambient request context. The canonical
mechanism in the pack is [`@neomaventures/request-context`][rc], which
exposes an `AsyncLocalStorage`-backed request slot you can read from
anywhere below the controller boundary. Mailbox doesn't depend on it; you
wire it in.

[rc]: ../request-context

```typescript
import { OAuthTokenService } from "@neomaventures/auth"
import {
  GMAIL_READONLY_SCOPE,
  type TokenAccessor,
} from "@neomaventures/mailbox"
import { getRequest } from "@neomaventures/request-context"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AuthTokenAccessor implements TokenAccessor {
  public constructor(private readonly oauthTokens: OAuthTokenService) {}

  public async getToken(scope: string): Promise<string> {
    if (scope !== GMAIL_READONLY_SCOPE) {
      throw new Error(`Unsupported scope: ${scope}`)
    }
    const account = getRequest()?.account
    if (!account) {
      throw new Error("No authenticated account on the current request")
    }
    const token = await this.oauthTokens.getActiveToken(account.id, "google")
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
throws `MailboxApiException` / `MailboxNetworkException` on failure.
Pair with [`@neomaventures/exceptions`][exc]' global `errorTemplates` to
render a friendly error UI on those exceptions.

[exc]: ../exceptions

`@MailboxStats()` reads `req.mailboxStats`. If `@WithMailboxStats()`
wasn't applied to the route, `req.mailboxStats` is `undefined` and the
decorator throws a plain `Error` naming the likely fix (apply
`@WithMailboxStats()`). This is a programmer-error signal, not a runtime
exception your app should catch — apply the decorator and the error
goes away.

```typescript
import { ExceptionHandlerModule } from "@neomaventures/exceptions"
import {
  type GmailLabelStats,
  MailboxStats,
  WithMailboxStats,
} from "@neomaventures/mailbox"
import { Controller, Get, Module } from "@nestjs/common"

@Controller("profile")
export class ProfileController {
  @Get("inbox")
  @WithMailboxStats()
  public inbox(@MailboxStats() stats: GmailLabelStats): GmailLabelStats {
    return stats
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
    messageCount: number
    unreadCount: number
  }> {
    return this.mailbox.getStats()
  }
}
```

Either way, `getStats` calls the Gmail Labels API
(`GET /gmail/v1/users/me/labels/INBOX`) on every request — no caching in
v0.1.0. The `TokenAccessor` is invoked with `GMAIL_READONLY_SCOPE` before
the call so the freshest available token is used.

## Failure modes

Mailbox surfaces two kinds of failure from `MailboxStatsInterceptor`,
and one programmer-error signal from `@MailboxStats()`. This section
covers what each one is, where the interceptor is applied, and how to
render the runtime exceptions via `@neomaventures/exceptions`.

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
are unaffected:

```typescript
import {
  type GmailLabelStats,
  MailboxStats,
  WithMailboxStats,
} from "@neomaventures/mailbox"
import { Controller, Get } from "@nestjs/common"

@Controller("profile")
export class ProfileController {
  @Get("inbox")
  @WithMailboxStats()
  public inbox(@MailboxStats() stats: GmailLabelStats): GmailLabelStats {
    return stats
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

[exc]: ../exceptions

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
- `GmailSystemLabel` enum — Gmail's well-known label IDs (`Inbox`, `Sent`,
  `Draft`, `Trash`, `Spam`, `Starred`, `Important`, `Unread`).

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
