# @neomaventures/healthcheck

Drop-in healthcheck endpoint for NestJS with auto-detected probes.

## Why?

Every NestJS app eventually grows a `/health` endpoint, and every team writes a slightly different version of the same controller method. This package replaces that one-liner with a decorator that:

- Always reports HTTP health (`{ "http": "ok" }`) — if the response arrives, the HTTP stack works.
- Auto-detects a TypeORM `DataSource` and adds a `SELECT 1` connectivity probe.
- Accepts pluggable upstream probes via `HealthcheckModule.forRoot({ probes: [...] })` — HTTP probes for the common case (MinIO `/minio/health/live`, mail-provider health endpoints, generic SaaS APIs) and a custom-check escape hatch for everything else.
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
| No TypeORM `DataSource` registered, no probes | `{ "http": "ok", "checkedAt": "..." }` |
| `DataSource` registered, healthy | `{ "http": "ok", "database": "ok", "checkedAt": "..." }` |
| `DataSource` registered, `SELECT 1` fails | `{ "http": "ok", "database": "error", "checkedAt": "..." }` |
| Probes configured, all healthy | `{ "http": "ok", "probes": { "<name>": { "ok": true, "latencyMs": 23 }, ... }, "checkedAt": "..." }` |
| Probes configured, one failing | `{ "http": "ok", "probes": { "<name>": { "ok": false, "latencyMs": 5000, "error": "Timeout after 5000ms" }, ... }, "checkedAt": "..." }` |

`checkedAt` is an ISO timestamp generated when the probes ran — the service owns this value so it's consistent across JSON and HTML renderings and reflects the actual probe time, not the response-formatting time. The `probes` key is omitted entirely when no probes are configured.

## Upstream probes

Pass HTTP or custom probes to `HealthcheckModule.forRoot`:

```typescript
HealthcheckModule.forRoot({
  probes: [
    // HTTP probe — any 2xx is healthy unless expect.status is supplied.
    { name: "storage", url: `${process.env.S3_ENDPOINT}/minio/health/live` },
    { name: "mail", url: "https://api.resend.com/health", timeout: 3000 },

    // Custom probe — escape hatch for non-HTTP backends (TCP/SMTP, queues, SDKs).
    {
      name: "queue",
      check: async () => {
        try {
          await queue.ping()
          return { ok: true }
        } catch (err) {
          return { ok: false, error: (err as Error).message }
        }
      },
    },
  ],
})
```

Each probe contributes one entry under `body.probes[<name>]` with `{ ok, latencyMs, error? }`. Probes run in parallel; any failing probe flips the response status to 503. For k8s-style liveness/readiness pairs, name them `<name>:live` / `<name>:ready`.

HTTP probes use `AbortController` to cancel a hung fetch at the deadline. Custom probes use `Promise.race` — the runner can't cancel a consumer-supplied promise, so the underlying check keeps running until it settles naturally; the runner just stops waiting on it.

## HTTP status

| Probe outcome | Status |
|---|---|
| All probes `"ok"` | `200` |
| Any probe `"error"` | `503` |

The status is set directly on the response — no `ServiceUnavailableException` is thrown, so your global exception filters are not invoked and the JSON shape stays uniform across both branches.

## Probe timeout

Every probe — the auto-detected database probe and each configured upstream probe — has a 5-second default hard timeout (`PROBE_TIMEOUT_MS = 5000`). Upstream probes accept a per-probe `timeout` override. When the deadline elapses the probe reports `ok: false` (or `database: "error"`) and the route still returns `503` cleanly — your orchestrator's external timeout won't fire before ours, so the failure surfaces as a `503` and not a hung request.

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
  public status(@HealthStatus() status: HealthResult): HealthResult {
    return status
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
- Per-probe retries — every `/health` request runs each probe once.
- Probe-result caching — every `/health` runs probes fresh.
- Specialised wrapper packages (`@neomaventures/healthcheck-s3`, `@neomaventures/healthcheck-smtp`) for richer single-call semantics — separate slices.

If you need any of these, please file an issue describing the use case.

## License

MIT
