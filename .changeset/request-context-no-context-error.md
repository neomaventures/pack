---
"@neomaventures/request-context": minor
---

Add `NoContextError` — thrown by `set()` when called outside an active request context, with the original error preserved as `cause`. Also adds `ContextSlotPrimitiveError` for proxy access on primitive-typed slots.
