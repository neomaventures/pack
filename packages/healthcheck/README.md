# @neomaventures/healthcheck

Drop-in healthcheck endpoint for NestJS with auto-detected probes.

## Why?

Every NestJS app eventually grows a `/health` endpoint, and every team writes a slightly different version of the same controller method. This package replaces that one-liner with a decorator that:

- Always reports HTTP health (`{ "http": "ok" }`) — if the response arrives, the HTTP stack works.
- Auto-detects a TypeORM `DataSource` and adds a `SELECT 1` connectivity probe.
- Returns HTTP `503` when any probe is in error, so liveness/readiness probes can act on it directly.
- Ships the underlying `HealthService` as an injectable, so you can run the same probes from a scheduler, a guard, or your own custom controller.

## Installation

```bash
pnpm add @neomaventures/healthcheck
```

### Peer dependencies

- `@nestjs/common` (`11.x`)
- `@nestjs/core` (`11.x`)
- `rxjs` (`7.x`)
- `@nestjs/typeorm` (`11.x`) — **optional**, only needed for the database probe
- `typeorm` (`>=0.3`) — **optional**, only needed for the database probe

If your app doesn't use TypeORM, you don't need to install the optional peers — the package will still build and run, and the response will simply omit the `database` key.

## Quick start

```typescript
import { HealthcheckModule, HealthCheck } from "@neomaventures/healthcheck"
import { Controller, Get, Module } from "@nestjs/common"

@Controller()
export class HealthController {
  @Get("api/health")
  @HealthCheck()
  public health(): void {}
}

@Module({
  imports: [HealthcheckModule.forRoot()],
  controllers: [HealthController],
})
export class AppModule {}
```

The decorated method body is ignored at runtime — a global interceptor replaces the response with the aggregated probe result. `public health(): void {}` is intentional.

## Response shape

| Scenario | Body |
|---|---|
| No TypeORM `DataSource` registered | `{ "http": "ok" }` |
| `DataSource` registered, healthy | `{ "http": "ok", "database": "ok" }` |
| `DataSource` registered, `SELECT 1` fails | `{ "http": "ok", "database": "error" }` |

## HTTP status

| Probe outcome | Status |
|---|---|
| All probes `"ok"` | `200` |
| Any probe `"error"` | `503` |

The status is set directly on the response — no `ServiceUnavailableException` is thrown, so your global exception filters are not invoked and the JSON shape stays uniform across both branches.

## Calling probes from your own code

`HealthService` is exported and can be injected anywhere. Use it when you want the same probe logic without going through HTTP — for example, in a scheduled task, a guard, or a custom HTML dashboard route.

```typescript
import { HealthService } from "@neomaventures/healthcheck"
import { Controller, Get, Render } from "@nestjs/common"

@Controller()
export class DashboardController {
  public constructor(private readonly healthService: HealthService) {}

  @Get("dashboard/health")
  @Render("dashboard/health")
  public async dashboard(): Promise<{ result: Awaited<ReturnType<HealthService["check"]>> }> {
    return { result: await this.healthService.check() }
  }
}
```

The package returns JSON only. HTML rendering is the consumer's responsibility — `HealthService.check()` is the seam.

## Troubleshooting

**The `database` probe returns `"error"`.** Verify your `DataSource` actually connects on app boot. This package doesn't change connectivity behaviour — it only reports it. A failing probe means the underlying connection is broken.

**The `database` key is missing.** No `DataSource` is registered in the consuming app's DI container. Either import `TypeOrmModule.forRoot({ ... })` or accept that the probe will not run.

## What's not in v0

- Per-probe disable flag (`@HealthCheck({ database: false })`)
- Custom-probe plugin pattern (no `probes: [...]` option on `forRoot`)
- Redis, queue, outbound HTTP, or other non-DataSource probes
- HTML rendering — the package returns JSON only

If you need any of these, please file an issue describing the use case.

## License

MIT
