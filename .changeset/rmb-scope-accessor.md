---
"@neomaventures/route-model-binding": minor
---

Add ScopeAccessor for post-load entity scoping. After an entity is resolved from a route parameter, an optional ScopeAccessor can check whether the current context is allowed to access it. Denial returns 404 (default, hides entity existence) or 403 (configurable). The accessor is resolved via DI and called per entity on multi-param routes.
