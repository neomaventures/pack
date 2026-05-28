# @neoma/request-context

Per-request context (AsyncLocalStorage) for NestJS — read the current request anywhere below the controller, no request scope.

## Installation

```bash
npm install @neoma/request-context
```

## Usage

Import `RequestContextModule.forRoot()` once in your root module. It opens one
`AsyncLocalStorage` context per request, so the live request is reachable from
anywhere in the call stack.

```typescript
import { RequestContextModule } from "@neoma/request-context"
import { Module } from "@nestjs/common"

@Module({
  imports: [RequestContextModule.forRoot()],
})
export class AppModule {}
```

`forRoot()` takes no options.

### Reading the request

Call `getRequest()` anywhere below the controller boundary — in a plain
singleton service, a repository, a TypeORM listener — with no `@Req()`, no
`Scope.REQUEST`, and no threading `req` through your call stack.

```typescript
import { getRequest } from "@neoma/request-context"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AuditService {
  record(): void {
    const request = getRequest()
    const userId = request?.headers["x-user-id"]
    // ...
  }
}
```

`getRequest()` returns the live request being handled, or `undefined` when
called outside any request (at bootstrap, in a script, or in a background job).
It never throws. Concurrent requests are fully isolated — each call site sees
its own request.

## License

MIT
