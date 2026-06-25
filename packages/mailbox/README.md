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
npm install @nestjs/common @nestjs/core
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

#### Path A — `@MailboxStats()` param decorator (recommended)

Mount `MailboxStatsMiddleware` on the routes that need stats, then read
the resolved value with the `@MailboxStats()` decorator. The middleware
is a silent resolver (never throws); the decorator enforces presence and
throws `MailboxStatsUnavailableException` (HTTP 502) when stats couldn't
be resolved. No controller-level try/catch.

```typescript
import {
  GmailLabelStats,
  MailboxStats,
  MailboxStatsMiddleware,
} from "@neomaventures/mailbox"
import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common"

@Controller("profile")
export class ProfileController {
  @Get("inbox")
  public inbox(@MailboxStats() stats: GmailLabelStats): GmailLabelStats {
    return stats
  }
}

@Module({ controllers: [ProfileController] })
export class ProfileModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MailboxStatsMiddleware).forRoutes("profile/inbox")
  }
}
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

## Exceptions

- `GmailApiException` — thrown when Gmail returns a non-2xx. Upstream 401/404
  surface verbatim; everything else collapses to `502 Bad Gateway`. Wire
  response is minimal and package-named —
  `{ statusCode, message: "Mailbox API returned <status>", error: "MailboxApi" }`
  — so the wire never discloses which upstream provider the package uses
  today. Debug fields (`endpoint`, `context`, `responseBody`, `cause`) live
  on the instance for server-side logs only.
- `GmailNetworkException` — thrown when `fetch()` rejects (DNS, TCP,
  timeout, connection dropped). Returns `502 Bad Gateway` with the
  package-named wire shape
  `{ statusCode, message: "Mailbox network error", error: "MailboxNetwork" }`.
- `MailboxStatsUnavailableException` — thrown by `@MailboxStats()` when no
  middleware-resolved stats are present on the request. Returns `502 Bad
  Gateway` with wire shape
  `{ statusCode, message, error: "MailboxStatsUnavailable" }`.

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
