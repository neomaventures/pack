---
"@neomaventures/route-model-binding": minor
---

**BREAKING**: Middleware no longer throws `NotFoundException` for missing entities. It assigns `null` to `req.routeModels[name]` and always populates `req.routeModelMeta`. The `@RouteModel()` param decorator now throws `NotFoundException` after all guards have run. `ScopeAccessGuard` skips null entities.
