# @neomaventures/route-model-binding

## 0.4.0

### Minor Changes

- cdd09a7: Throw a descriptive `RouteModelBindingNotAppliedException` (HTTP 500) when
  `@RouteModel(...)` is invoked on a route where `RouteModelBindingMiddleware`
  has not been applied, instead of surfacing as a generic 404.

  Behaviour change: routes that previously returned `404 NotFoundException`
  with message `Could not find <param> with id unknown` because the middleware
  was not wired up will now return `500 RouteModelBindingNotAppliedException`
  naming the param and pointing at `RouteModelBindingMiddleware`. Consumers
  relying on the 404 response for an unwired route are misusing the package;
  wire the middleware in your module's `configure()`.

  Behaviour for resolved-but-missing entities (`null` lookup) and for routes
  where the middleware ran but the param key was not declared is unchanged
  (still `404 NotFoundException`).

## 0.3.0

### Minor Changes

- 9f39b31: **BREAKING**: Middleware no longer throws `NotFoundException` for missing entities. It assigns `null` to `req.routeModels[name]` and always populates `req.routeModelMeta`. The `@RouteModel()` param decorator now throws `NotFoundException` after all guards have run. `ScopeAccessGuard` skips null entities.

## 0.2.1

### Patch Changes

- a82453d: Move ScopeAccessor check from middleware to guard so scope denial exceptions flow through the controller's decorator chain, enabling consumer exception filters like @ErrorTemplate to intercept them.

## 0.2.0

### Minor Changes

- abfcab2: Add ScopeAccessor for post-load entity scoping. After an entity is resolved from a route parameter, an optional ScopeAccessor can check whether the current context is allowed to access it. Denial returns 404 (default, hides entity existence) or 403 (configurable). The accessor is resolved via DI and called per entity on multi-param routes.
