# @neomaventures/webhooks

Webhook signature verification for NestJS -- Svix-standard HMAC-SHA256 guard.

## Installation

```bash
npm install @neomaventures/webhooks
```

## Usage

### 1. Import the module

Register `WebhooksModule` once in your root module — it registers globally, so
the guard and options are available to all modules without re-importing.

```typescript
import { WebhooksModule } from "@neomaventures/webhooks"

@Module({
  imports: [
    WebhooksModule.forRoot({
      secret: process.env.WEBHOOK_SECRET!, // e.g. "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
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
    secret: config.get("WEBHOOK_SECRET"),
  }),
  inject: [ConfigService],
})
```

### 2. Apply the guard to webhook endpoints

The guard can be used in any module — no need to import `WebhooksModule` again.

```typescript
import { WebhookSignatureGuard } from "@neomaventures/webhooks"
import { Controller, Post, UseGuards } from "@nestjs/common"

@Controller("webhooks")
export class WebhookController {
  @Post()
  @UseGuards(WebhookSignatureGuard)
  handleWebhook(@Body() payload: any): void {
    // Guard already verified the signature
  }
}
```

### 3. Enable rawBody on the NestJS application factory

The guard reads `req.rawBody` to compute the signature. Without it, the guard returns HTTP 500.

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true })
```

## API

### `WebhooksModule`

| Method | Description |
|--------|-------------|
| `forRoot(options)` | Static configuration with a `WebhooksOptions` object |
| `forRootAsync(options)` | Async configuration via `useFactory`, `useClass`, or `useExisting` |

Both methods register the module globally.

### `WebhooksOptions`

| Property | Type | Description |
|----------|------|-------------|
| `secret` | `string` | Svix-format signing secret (`whsec_` prefix + base64 key) |

### `WebhookSignatureGuard`

A NestJS `CanActivate` guard that validates the `svix-id`, `svix-timestamp`, and `svix-signature` headers against the request body.

## License

MIT
