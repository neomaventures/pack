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
- `@nestjs/typeorm` (`11.x`)
- `typeorm` (`>=0.3`)

All peers are required — `HealthService` imports `getDataSourceToken` from `@nestjs/typeorm` at module load. If your consuming app doesn't register a `DataSource`, the response simply omits the `database` key at runtime, but the TypeORM package itself still needs to be installed for `HealthService` to resolve.

## Quick start

```typescript
import {
  HealthcheckModule,
  HealthCheck,
  HealthStatus,
  type HealthResult,
} from "@neomaventures/healthcheck"
import { Controller, Get, Module } from "@nestjs/common"

@Controller()
export class HealthController {
  @Get("api/health")
  @HealthCheck()
  public health(@HealthStatus() status: HealthResult): HealthResult {
    return status
  }
}

@Module({
  imports: [HealthcheckModule.forRoot()],
  controllers: [HealthController],
})
export class AppModule {}
```

The global `HealthcheckInterceptor` runs the probes, sets the HTTP status (200 / 503), attaches the result to the request, and passes control to the controller method. `@HealthStatus()` extracts the attached result so the method body is a thin pass-through — no `HealthService` to inject, no probe to call, no timestamp to generate. The same pattern works for HTML render routes (see [HTML rendering](#html-rendering) below).

## Response shape

`HealthService.check()` and the `@HealthCheck()` JSON response both return `HealthResult`:

| Scenario | Body |
|---|---|
| No TypeORM `DataSource` registered | `{ "http": "ok", "checkedAt": "..." }` |
| `DataSource` registered, healthy | `{ "http": "ok", "database": "ok", "checkedAt": "..." }` |
| `DataSource` registered, `SELECT 1` fails | `{ "http": "ok", "database": "error", "checkedAt": "..." }` |

`checkedAt` is an ISO timestamp generated when the probes ran — the service owns this value so it's consistent across JSON and HTML renderings and reflects the actual probe time, not the response-formatting time.

## HTTP status

| Probe outcome | Status |
|---|---|
| All probes `"ok"` | `200` |
| Any probe `"error"` | `503` |

The status is set directly on the response — no `ServiceUnavailableException` is thrown, so your global exception filters are not invoked and the JSON shape stays uniform across both branches.

## Probe timeout

The database probe has a 5-second hard timeout. If `SELECT 1` doesn't resolve within `PROBE_TIMEOUT_MS` (exported from `healthcheck.constants`), the probe reports `database: "error"` and the route still returns `503` cleanly — your orchestrator's external timeout won't fire before ours, so the failure surfaces as a `503` and not a hung request.

## HTTP-only

`@HealthCheck()` only works on HTTP routes for now. Applying it to a Microservice / WebSocket / RPC handler throws at request time with a descriptive error. If you need probes on non-HTTP transports, please file an issue describing the use case.

## HTML rendering

Use the same `@HealthCheck()` + `@HealthStatus()` pair on a route that's also decorated with `@Render(...)`. The interceptor runs the probes and attaches the result to the request before the controller method runs; the controller passes the result into the render context.

```typescript
import {
  HealthCheck,
  type HealthResult,
  HealthStatus,
} from "@neomaventures/healthcheck"
import { Controller, Get, Render } from "@nestjs/common"

@Controller()
export class StatusController {
  @Get("health")
  @HealthCheck()
  @Render("application/status")
  public status(@HealthStatus() status: HealthResult): { result: HealthResult } {
    return { result: status }
  }
}
```

The HTTP status is still set by the interceptor (200/503). If your HTML template should always return 200 regardless of probe outcome (e.g. an operator status page), set the response status explicitly inside the method or use a separate route with no `@HealthCheck()`.

## Calling probes from your own code

`HealthService` is exported and can be injected anywhere. Use it when you want the probe logic outside the HTTP layer — for example, a scheduled task, a guard, or a non-controller workflow.

```typescript
import { HealthService } from "@neomaventures/healthcheck"
import { Injectable } from "@nestjs/common"

@Injectable()
export class StatusReporter {
  public constructor(private readonly healthService: HealthService) {}

  public async report(): Promise<void> {
    const result = await this.healthService.check()
    // ...do something with the result
  }
}
```

Inside HTTP controllers, prefer the `@HealthCheck()` + `@HealthStatus()` decorator pair over direct injection — it keeps the method as a thin pass-through and centralises the status-code decision.

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
