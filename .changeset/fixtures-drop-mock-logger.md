---
"@neomaventures/fixtures": minor
---

**BREAKING**: `MockLoggerService` has been removed from `@neomaventures/fixtures`. The mock has moved to `@neomaventures/logging/testing` and been renamed `MockLogger` — it belongs with the `Logger` contract it implements, and the move removes the `fixtures` ↔ `logging` workspace cycle.

Consumers:

```ts
// before
import { MockLoggerService } from "@neomaventures/fixtures"
const logger = new MockLoggerService()

// after
import { MockLogger } from "@neomaventures/logging/testing"
const logger = new MockLogger()
```

The mock still implements the `Logger` interface — six jest-mock methods (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).
