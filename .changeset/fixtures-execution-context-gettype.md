---
"@neomaventures/fixtures": minor
---

Add `getType()` to `executionContext`. Defaults to `"http"` (the overwhelmingly common case) and accepts an optional 5th positional parameter to override (e.g. `"rpc"`, `"ws"`) for exercising non-HTTP code paths — needed when testing interceptors or guards that should branch on context type.
