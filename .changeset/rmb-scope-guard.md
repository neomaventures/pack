---
"@neomaventures/route-model-binding": patch
---

Move ScopeAccessor check from middleware to guard so scope denial exceptions flow through the controller's decorator chain, enabling consumer exception filters like @ErrorTemplate to intercept them.
