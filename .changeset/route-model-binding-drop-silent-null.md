---
"@neomaventures/route-model-binding": minor
---

Drop the silent-null workaround. `RouteModelBindingMiddleware` now throws `NotFoundException` directly when an entity cannot be resolved, instead of stashing `null` on the request for the `@RouteModel()` decorator to throw on. The HTTP wire shape (`404`, message, `error: "Not Found"`) is unchanged.

The `@RouteModel()` decorator collapses to a pure read — it no longer throws `NotFoundException`. The `RouteModelBindingNotAppliedException` (HTTP 500) for missing middleware wiring is unchanged.

**Consumer migration:** if you previously caught the decorator-thrown `NotFoundException` with a route-level `@ErrorTemplate`, switch to `ExceptionHandlerModule.forRoot({ errorTemplates: { NotFoundException: "errors/not-found", default: "errors/generic" } })` so the middleware-thrown exception renders the same UI. See README.
