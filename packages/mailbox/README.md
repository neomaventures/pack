# @neomaventures/mailbox

Provider-agnostic mailbox primitive for NestJS applications. Gmail-first.

Mailbox owns the boundary between your app and a hosted mailbox provider.
It does **not** classify mail — consuming apps (CRMs, document modules,
support tools) apply their own domain logic on top. The package ships an
auth-agnostic token boundary (`TokenAccessor`), a reference `MailAccount`
entity that records which Gmail address an account has connected, and a
service that hits the live provider for stats.

> **Status: v0.1.0 — proof of life.** This release exists to prove the
> wiring end-to-end: a host app implements `TokenAccessor`, registers
> `MailAccount` with TypeORM, and reads inbox stats live from Gmail. Raw
> `.eml` sync, sync cursors, `MessageStoredEvent` emission, and the
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
npm install @nestjs/common @nestjs/core @nestjs/typeorm \
  typeorm reflect-metadata rxjs
```

## Entity model — interface, reference entity, and your own

Mailbox defines one TypeScript contract — `Mailboxable` — and ships a
concrete `MailAccount` reference class implementing it. Consumers
register the reference entity for the zero-config path, or replace it
with their own class via `entity:` to attach domain relations (e.g.
`Account.mailAccounts: MailAccount[]`).

The reference entity is intentionally slim for v0.1.0:

| Column         | Type   | Purpose                                            |
| -------------- | ------ | -------------------------------------------------- |
| `id`           | uuid   | Primary key                                        |
| `accountId`    | string | FK to the consumer's `Authenticatable` (loose ref) |
| `gmailAddress` | string | The Gmail address this connection represents      |

No cached stats columns, no sync cursors — those land in future slices
when there is a writer for them.

```typescript
import { MailAccount } from "@neomaventures/mailbox/entities"
```

The consumer always owns `TypeOrmModule.forFeature` registration.

## Getting started — default path

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

### 2. Register `MailAccount` with TypeORM

```typescript
import { MailAccount } from "@neomaventures/mailbox/entities"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      // ...your database config
      entities: [MailAccount /* , YourOtherEntities */],
    }),
    TypeOrmModule.forFeature([MailAccount]),
  ],
})
export class AppModule {}
```

### 3. Configure `MailboxModule`

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

### 4. Read stats in a controller

```typescript
import { Authenticated } from "@neomaventures/auth"
import { MailboxService } from "@neomaventures/mailbox"
import { Controller, Get } from "@nestjs/common"

@Controller("mailbox")
export class MailboxController {
  public constructor(private readonly mailbox: MailboxService) {}

  @Get("stats")
  @Authenticated()
  public async stats(): Promise<{
    messageCount: number
    unreadCount: number
  }> {
    return this.mailbox.getStats()
  }
}
```

`getStats` calls the Gmail Labels API
(`GET /gmail/v1/users/me/labels/INBOX`) on every request — no caching in
v0.1.0. The `TokenAccessor` is invoked with `GMAIL_READONLY_SCOPE` before
the call so the freshest available token is used.

## Custom entity — attach relations from the consumer side

The reference `MailAccount` ships without consumer relations because it
cannot import consumer entities. To attach
`Account.mailAccounts: MailAccount[]`, implement `Mailboxable` on your
own class and pass it via `entity:`:

```typescript
import { type Mailboxable } from "@neomaventures/mailbox"
import { Account } from "@neomaventures/auth/entities"
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"

@Entity({ name: "mail_account" })
export class CustomMailAccount implements Mailboxable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public gmailAddress!: string

  @ManyToOne(() => Account, (a) => a.mailAccounts)
  public account!: Account

  @Column()
  public accountId!: string
}

MailboxModule.forRoot({
  tokenAccessor: AuthTokenAccessor,
  entity: CustomMailAccount,
})
```

`MailboxService<T extends Mailboxable>` parametrises on your entity, so
the consumer narrows at injection without a cast:

```typescript
public constructor(
  private readonly mailbox: MailboxService<CustomMailAccount>,
) {}
```

## What this slice does **not** ship

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
