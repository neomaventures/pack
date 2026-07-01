---
"@neomaventures/request-context": minor
---

Add `/testing` subpath with `runInRequestContext(fn)`.

Test-time entry point for opening a `nestjs-cls` request context so context-slots can be read and written from unit specs (no middleware). Encapsulates the `ClsServiceManager` boundary — consumers never need to import `nestjs-cls` directly.

```typescript
import { runInRequestContext } from "@neomaventures/request-context/testing"

await runInRequestContext(async () => {
  slot.set(value)
  expect(slot.get()).toBe(value)
})
```

Downstream packages layer domain-specific helpers on top (e.g. `runInAuthContext` in `@neomaventures/auth/testing`).
