# @neomaventures/webhooks

Webhook signature verification and idempotent event ingestion for NestJS. Verify inbound webhooks from Svix-standard providers (Resend, Clerk, etc.) and deduplicate retried deliveries at the database level.

## Features

- Svix-standard HMAC-SHA256 signature verification
- Idempotent ingestion via database-level deduplication (`INSERT ... ON CONFLICT`)
- Duplicate deliveries short-circuit with HTTP 204 No Content
- Domain events for unique and duplicate webhook receipts
- Horizontally safe — dedup correctness relies on the DB unique constraint, not app-level state

## Installation

`@neomaventures/*` packages publish privately to GitHub Packages. Configure `.npmrc` to resolve the `@neomaventures` scope first:

```
@neomaventures:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
npm install @neomaventures/webhooks
```

### Peer dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm @nestjs/event-emitter reflect-metadata rxjs
```

## Quick Start

### 1. Define your webhook event entity

Your entity implements the `WebhookEventEntity` interface. You own the entity, the migration, and the table.

```typescript
import { type WebhookEventEntity } from "@neomaventures/webhooks"
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm"

@Entity()
@Unique(["provider", "externalId"])
export class InboundWebhookEvent implements WebhookEventEntity {
  @PrimaryGeneratedColumn("uuid")
  public id: string

  @Column()
  public provider: string

  @Column()
  public externalId: string

  @Column()
  public receivedAt: Date
}
```

**The composite unique constraint on `(provider, externalId)` is required.** The dedup mechanism uses `INSERT ... ON CONFLICT` against this constraint. If the constraint is missing, every delivery inserts successfully and dedup silently fails. There is no schema validation at boot — this is your responsibility.

### 2. Register the module

```typescript
import { WebhooksModule } from "@neomaventures/webhooks"

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    WebhooksModule.forRoot({
      secret: process.env.WEBHOOK_SECRET,
      entity: InboundWebhookEvent,
    }),
  ],
})
export class AppModule {}
```

Or use `forRootAsync` for DI-based configuration:

```typescript
WebhooksModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow("WEBHOOK_SECRET"),
    entity: InboundWebhookEvent,
  }),
  inject: [ConfigService],
})
```

The module registers globally — the guard and `@WebhookHandler()` decorator are available to all modules without re-importing.

### 3. Enable rawBody on the NestJS application factory

The guard reads `req.rawBody` to compute the signature. Without it, the guard returns HTTP 500.

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true })
```

### 4. Apply the guard and handler decorator to webhook endpoints

```typescript
import {
  WebhookSignatureGuard,
  WebhookHandler,
} from "@neomaventures/webhooks"
import { Body, Controller, Post, UseGuards } from "@nestjs/common"

@Controller("webhooks")
export class WebhookController {
  @Post("inbound-email")
  @UseGuards(WebhookSignatureGuard)
  @WebhookHandler("resend")
  public async handleInboundEmail(@Body() payload: any): Promise<void> {
    // 1. Signature already verified by the guard
    // 2. Duplicates already short-circuited with 204 by the decorator
    // 3. This handler only runs for unique, verified events
  }
}
```

## How It Works

### Signature verification

The `WebhookSignatureGuard` verifies Svix-standard HMAC-SHA256 signatures:

1. Checks for required headers (`svix-id`, `svix-timestamp`, `svix-signature`)
2. Strips the `whsec_` prefix from the secret and base64-decodes the key
3. Computes HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${rawBody}`
4. Supports multiple signatures in the header (space-separated)
5. Uses `crypto.timingSafeEqual` for constant-time comparison
6. Throws `UnauthorizedException` (401) for any verification failure

### Deduplication

The `@WebhookHandler()` decorator applies the `WebhookInterceptor` which deduplicates inbound events before they reach your handler:

1. **Extracts the event ID** from the `svix-id` header
2. **Attempts an insert** using the DB unique constraint for race-free dedup (`INSERT ... ON CONFLICT DO NOTHING`)
3. **If the event is new:** continues to the handler, then fires `webhook.received` (if event-emitter installed)
4. **If the event is a duplicate:** short-circuits with HTTP 204 No Content, fires `webhook.duplicate` (if event-emitter installed)

This approach is horizontally safe — dedup correctness relies entirely on the database constraint, not application-level state or locks.

### What happens when...

| Scenario | Result |
|----------|--------|
| First receipt of an event | Entity persisted, handler runs, `webhook.received` event fired |
| Duplicate receipt (same provider + externalId) | HTTP 204, handler skipped, `webhook.duplicate` event fired |
| Consumer forgot the unique constraint | Dedup silently fails (every insert succeeds) |
| Database error during insert | Error propagates to exception filters normally |

## Events

Requires `@nestjs/event-emitter` and `EventEmitterModule.forRoot()` in your app module.

### `webhook.received`

Fired for unique events after the handler completes successfully.

```typescript
import { WebhookReceivedEvent } from "@neomaventures/webhooks"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class WebhookMetricsService {
  @OnEvent(WebhookReceivedEvent.NAME)
  public onReceived(event: WebhookReceivedEvent): void {
    console.log(`Webhook received: ${event.provider}/${event.id}`)
  }
}
```

### `webhook.duplicate`

Fired for duplicate events (useful for observability and alerting on excessive retries).

```typescript
import { WebhookDuplicateEvent } from "@neomaventures/webhooks"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class WebhookMetricsService {
  @OnEvent(WebhookDuplicateEvent.NAME)
  public onDuplicate(event: WebhookDuplicateEvent): void {
    console.log(`Duplicate webhook: ${event.provider}/${event.id}`)
  }
}
```

Both events carry `{ provider, id, receivedAt }`.

## API Reference

### `WebhooksModule`

| Method | Description |
|--------|-------------|
| `forRoot(options)` | Static configuration with a `WebhooksOptions` object |
| `forRootAsync(options)` | Async configuration via `useFactory`, `useClass`, or `useExisting` |

Both methods register the module globally.

### `WebhooksOptions`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `secret` | `string` | Yes | Svix-format signing secret (`whsec_` prefix + base64 key) |
| `entity` | `Type<WebhookEventEntity>` | Yes | Your entity class implementing `WebhookEventEntity` |

### `WebhookEventEntity`

The interface your entity must implement:

```typescript
interface WebhookEventEntity {
  id: string          // PK — consumer's choice (uuid, ulid, etc.)
  provider: string    // set by @WebhookHandler("resend") — identifies the webhook source
  externalId: string     // provider's event ID (from svix-id header)
  receivedAt: Date    // timestamp of first receipt
}
```

Your entity **must** enforce a `UNIQUE(provider, externalId)` constraint.

### `WebhookSignatureGuard`

Guard that verifies Svix-standard HMAC-SHA256 signatures.

```typescript
@UseGuards(WebhookSignatureGuard)
```

### `WebhookHandler(provider)`

Method decorator that applies the `WebhookInterceptor` for dedup. Same pattern as `@Upload()` in `@neomaventures/storage`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `string` | Yes | Label identifying the webhook source (e.g. `"resend"`, `"clerk"`). Stored on the persisted entity. |

```typescript
@WebhookHandler("resend")
```

Composes to:

```typescript
applyDecorators(
  SetMetadata(WEBHOOK_HANDLER_PROVIDER_KEY, provider),
  UseInterceptors(WebhookInterceptor),
)
```

### `WebhookReceivedEvent`

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `string` | The provider identifier |
| `id` | `string` | The provider's event ID |
| `receivedAt` | `Date` | Timestamp of receipt |

Static: `NAME = "webhook.received"`

### `WebhookDuplicateEvent`

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `string` | The provider identifier |
| `id` | `string` | The provider's event ID |
| `receivedAt` | `Date` | Timestamp of the duplicate receipt |

Static: `NAME = "webhook.duplicate"`

### Exports

| Export | Kind | Purpose |
|--------|------|---------|
| `WebhooksModule` | class | Module registration |
| `WEBHOOKS_OPTIONS` | symbol | DI token for injecting options |
| `WebhooksOptions` | type | Options interface |
| `WebhookSignatureGuard` | class | Svix signature verification guard |
| `WebhookHandler` | decorator | Method decorator applying the dedup interceptor |
| `WebhookEventEntity` | interface | Entity contract |
| `WebhookReceivedEvent` | class | Event payload for `webhook.received` |
| `WebhookDuplicateEvent` | class | Event payload for `webhook.duplicate` |
| `WebhookRawBodyException` | class | Thrown when `rawBody` is not enabled (500) |

## Error Handling

Errors propagate to your exception filters normally. The interceptor does not swallow errors.

| Error | Source | Behaviour |
|-------|--------|-----------|
| Missing rawBody | Guard | `WebhookRawBodyException` (500) — enable `rawBody: true` on the app factory |
| Missing or invalid signature headers | Guard | `UnauthorizedException` (401) |
| Invalid signature | Guard | `UnauthorizedException` (401) |
| Database error during dedup insert | `@WebhookHandler()` | Propagates to exception filters |

## Troubleshooting

### Dedup is not working (every delivery inserts)

Your entity is missing the `UNIQUE(provider, externalId)` constraint. Add it via `@Unique(["provider", "externalId"])` on your entity class and run a migration. The package does not validate the schema at boot.

### `WebhookRawBodyException` (500)

You have not enabled `rawBody` on the NestJS application factory. The guard throws `WebhookRawBodyException` (extends `InternalServerErrorException`) with a message directing you to add `{ rawBody: true }` to `NestFactory.create()`.

### Events are not firing

Ensure `EventEmitterModule.forRoot()` is imported in your app module.

## License

MIT
